"""
Entrena el modelo XGBoost de riesgo de emergencias por distrito y mes con el historial real del INDECI (SINPAD).

Pregunta que responde: ¿qué probabilidad hay de que un distrito tenga al menos una emergencia por
lluvias intensas, huaico, inundación o deslizamiento en un mes dado?

Uso (desde la raíz del repo, con el backend ejecutado al menos una vez para crear elnino.db):
    python -m venv ml/.venv && ml/.venv/Scripts/pip install xgboost pandas scikit-learn
    ml/.venv/Scripts/python ml/train_risk_model.py

Salida (la carga el backend .NET, que evalúa los árboles él mismo: sin Python en producción):
    backend/data/ml/riesgo_xgb.json   modelo XGBoost (formato JSON nativo)
    backend/data/ml/riesgo_meta.json  variables, umbrales de nivel, métricas y episodios de El Niño

Las variables son SOLO estacionales y de largo plazo, nunca "emergencias del mes pasado":
los datos del SINPAD se publican con meses de retraso y el modelo debe valer igual con datos desfasados.
Deben calcularse exactamente igual en RiskModelService.cs.
"""
import json
import sqlite3
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "backend/src/ElNino.API/elnino.db"
OUT = ROOT / "backend/data/ml"

HAZARDS = ("Huaico", "Inundacion", "LluviaIntensa", "Deslizamiento")
START_YEAR = 2010
FEATURES = [
    "mes",                    # 1-12
    "region",                 # 0 costa, 1 sierra, 2 selva/sin dato
    "frac_anios_mes",         # fracción de años previos con emergencia en este mes, en el distrito
    "frac_anios_mes_vecinos", # promedio de la misma fracción para el mes anterior y el siguiente
    "eventos_por_anio",       # emergencias por año en el distrito (todo el historial previo)
    "frac_anios_mes_dpto",    # fracción de años previos con emergencia en este mes, en el departamento
    "nino_costero",           # 1 si hay episodio de El Niño costero (ENFEN)
]

# ponytail: episodios aproximados de El Niño costero según comunicados del ENFEN; afinar con las fechas oficiales exactas.
NINO_EPISODES = [("2015-04", "2016-05"), ("2017-01", "2017-05"), ("2023-03", "2024-04")]

VALIDATION_MONTHS = 24


def month_index(year, month):
    return (year - START_YEAR) * 12 + (month - 1)


def nino_mask(n_months):
    mask = np.zeros(n_months, dtype=np.int8)
    for start, end in NINO_EPISODES:
        (ys, ms), (ye, me) = map(int, start.split("-")), map(int, end.split("-"))
        mask[month_index(ys, ms) : month_index(ye, me) + 1] = 1
    return mask


def load():
    con = sqlite3.connect(DB)
    ev = pd.read_sql_query(
        f"select Ubigeo, Date from historical_events where Hazard in ({','.join('?' * len(HAZARDS))})",
        con, params=HAZARDS, parse_dates=["Date"],
    )
    districts = pd.read_sql_query("select Ubigeo, NaturalRegion from districts", con)
    return ev, districts


def build_panel(ev, districts):
    ubigeos = districts.Ubigeo.tolist()
    pos = {u: i for i, u in enumerate(ubigeos)}
    ev = ev[ev.Ubigeo.isin(pos)]
    last = ev.Date.max()
    n_months = month_index(last.year, last.month) + 1
    n_d = len(ubigeos)

    counts = np.zeros((n_d, n_months), dtype=np.int32)
    np.add.at(counts, (ev.Ubigeo.map(pos).to_numpy(), month_index(ev.Date.dt.year, ev.Date.dt.month).to_numpy()), 1)
    present = (counts > 0).astype(np.int32)

    depts = sorted({u[:2] for u in ubigeos})
    dpos = np.array([depts.index(u[:2]) for u in ubigeos])
    dept_present = np.zeros((len(depts), n_months), dtype=np.int32)
    np.maximum.at(dept_present, dpos, present)

    # same[:, m] = cuántos años previos (m-12, m-24, …) tuvieron emergencia en este mismo mes del calendario
    def prior_same_month(p):
        s = np.zeros_like(p)
        for m in range(12, n_months):
            s[:, m] = s[:, m - 12] + p[:, m - 12]
        return s

    same = prior_same_month(present)
    dept_same = prior_same_month(dept_present)
    cum = np.concatenate([np.zeros((n_d, 1), np.int64), np.cumsum(counts, axis=1)[:, :-1]], axis=1)  # eventos antes de m
    region = districts.NaturalRegion.map({"COSTA": 0, "SIERRA": 1}).fillna(2).to_numpy()
    nino = nino_mask(n_months)

    def frac(s, m):
        years = m // 12  # años previos disponibles para ese mes del calendario
        return s[:, m] / years if years else np.zeros(s.shape[0])

    rows = []
    for m in range(24, n_months):  # al menos 2 años de historia
        nxt = min(m + 1, n_months - 1)
        rows.append(np.column_stack([
            np.full(n_d, m % 12 + 1),
            region,
            frac(same, m),
            (frac(same, m - 1) + frac(same, nxt)) / 2,
            cum[:, m] / (m / 12),
            frac(dept_same, m)[dpos],
            np.full(n_d, nino[m]),
            present[:, m],      # etiqueta
            np.full(n_d, m),    # mes (para separar entrenamiento/validación)
        ]))
    panel = np.vstack(rows)
    return panel, n_months, last


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # consola de Windows
    ev, districts = load()
    panel, n_months, last = build_panel(ev, districts)
    X, y, m = panel[:, : len(FEATURES)], panel[:, len(FEATURES)], panel[:, len(FEATURES) + 1]
    cut = n_months - VALIDATION_MONTHS
    tr, va = m < cut, m >= cut
    print(f"Filas: {len(y):,} · positivas {y.mean():.1%} · validación desde el mes {cut} ({VALIDATION_MONTHS} meses finales)")

    model = xgb.XGBClassifier(
        n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8, colsample_bytree=0.9,
        min_child_weight=20, eval_metric="logloss", early_stopping_rounds=40, n_jobs=-1,
    )
    model.fit(pd.DataFrame(X[tr], columns=FEATURES), y[tr],
              eval_set=[(pd.DataFrame(X[va], columns=FEATURES), y[va])], verbose=False)

    p = model.predict_proba(pd.DataFrame(X[va], columns=FEATURES))[:, 1]
    baseline = X[va, FEATURES.index("frac_anios_mes")]  # "pasó en este mes otros años"
    metrics = {
        "auc": round(roc_auc_score(y[va], p), 4),
        "auc_linea_base": round(roc_auc_score(y[va], baseline), 4),
        "average_precision": round(average_precision_score(y[va], p), 4),
        "brier": round(brier_score_loss(y[va], p), 4),
        "tasa_base_validacion": round(float(y[va].mean()), 4),
        "arboles": int(model.best_iteration + 1),
    }
    print(json.dumps(metrics, indent=2))

    # Niveles por probabilidad: fijados para que en validación "muy alto" ≈ el 10 % de distritos-mes con más riesgo, etc.
    q = np.quantile(p, [0.5, 0.75, 0.9])
    thresholds = [round(float(v), 4) for v in q]
    hit_rates = []
    for name, lo, hi in [("bajo", 0, q[0]), ("moderado", q[0], q[1]), ("alto", q[1], q[2]), ("muy alto", q[2], 1.01)]:
        sel = (p >= lo) & (p < hi)
        hit_rates.append(round(float(y[va][sel].mean()), 4))
        print(f"  {name:9s} p∈[{lo:.3f},{hi:.3f}) → ocurrió en el {y[va][sel].mean():.1%} de los casos")

    OUT.mkdir(parents=True, exist_ok=True)
    # Solo los árboles hasta la mejor iteración: es lo que usa predict_proba tras el early stopping
    model.get_booster()[: model.best_iteration + 1].save_model(OUT / "riesgo_xgb.json")
    meta = {
        "descripcion": "Probabilidad de al menos una emergencia (lluvias intensas, huaico, inundación o deslizamiento) en el distrito durante el mes.",
        "fuente": "INDECI – SINPAD, emergencias por distrito desde 2010",
        "datos_hasta": last.strftime("%Y-%m-%d"),
        "features": FEATURES,
        "umbrales_nivel": thresholds,
        "tasa_real_por_nivel": hit_rates,  # en validación: fracción de casos de cada nivel en que sí hubo emergencia
        "episodios_nino_costero": NINO_EPISODES,
        "metricas_validacion": metrics,
    }
    (OUT / "riesgo_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # Vectores de prueba: el backend debe reproducir estas probabilidades con su propio evaluador de árboles
    idx = np.random.default_rng(0).choice(np.where(va)[0], 8, replace=False)
    vectors = [{"x": X[i].tolist(), "p": float(model.predict_proba(pd.DataFrame(X[i : i + 1], columns=FEATURES))[0, 1])} for i in idx]
    (OUT / "riesgo_vectores_prueba.json").write_text(json.dumps(vectors, indent=1), encoding="utf-8")
    print(f"Modelo guardado en {OUT}")


if __name__ == "__main__":
    main()

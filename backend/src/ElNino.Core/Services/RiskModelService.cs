using ElNino.Core.Entities;
using ElNino.Core.Interfaces;

namespace ElNino.Core.Services;

/// <summary>Predicción del modelo para un distrito y mes, con las variables usadas (para explicarla).</summary>
public record RiskPrediction(string Ubigeo, int Year, int Month, double Probability, int Level, IReadOnlyDictionary<string, double> Features);

/// <summary>
/// Riesgo de emergencia por distrito y mes con el modelo XGBoost local (ver ml/train_risk_model.py).
/// Las variables se calculan EXACTAMENTE como en el entrenamiento; si cambian allí, deben cambiar aquí.
/// Sin modelo cargado, <see cref="IsAvailable"/> es false y quien lo usa sigue con su cálculo por reglas.
/// </summary>
public class RiskModelService(
    IRepository<HistoricalEvent> events,
    IRepository<District> districts,
    IRepository<Bulletin> bulletins,
    XgbModel? model = null)
{
    private const int StartYear = 2010;

    private sealed record Index(
        Dictionary<string, HashSet<int>> DistrictMonths,
        Dictionary<string, int[]> DistrictMonthCounts,
        Dictionary<string, HashSet<int>> DeptMonths,
        Dictionary<string, int> Region,
        int LastMonth);

    // ponytail: índice en memoria construido una vez por proceso (el historial solo cambia al reimportar); invalidar si se agrega importación en caliente.
    private static Task<Index>? _index;
    private static readonly Lock IndexLock = new();

    public bool IsAvailable => model is not null;
    public XgbModel? Model => model;

    private static int MonthIndex(int year, int month) => (year - StartYear) * 12 + (month - 1);

    private Task<Index> GetIndexAsync(CancellationToken ct)
    {
        // Sin el token del llamador: si esa petición se cancela, no debe quedar cacheado un índice fallido
        lock (IndexLock) return _index ??= BuildIndexAsync(CancellationToken.None);
    }

    private async Task<Index> BuildIndexAsync(CancellationToken ct)
    {
        var region = (await districts.ListAsync(_ => true, ct)).ToDictionary(d => d.Ubigeo, d => d.NaturalRegion switch
        {
            "COSTA" => 0, "SIERRA" => 1, _ => 2,
        });
        // Igual que el entrenamiento: solo distritos presentes en la tabla de distritos
        var evs = await events.ListAsync(e => RiskMapService.Hazards.Contains(e.Hazard) && e.Date.Year >= StartYear, ct);
        var months = evs.Where(e => region.ContainsKey(e.Ubigeo))
            .Select(e => (e.Ubigeo, M: MonthIndex(e.Date.Year, e.Date.Month))).ToList();
        var last = months.Count == 0 ? 0 : months.Max(m => m.M);
        return new Index(
            months.GroupBy(m => m.Ubigeo).ToDictionary(g => g.Key, g => g.Select(m => m.M).ToHashSet()),
            months.GroupBy(m => m.Ubigeo).ToDictionary(g => g.Key, g =>
            {
                var counts = new int[last + 1];
                foreach (var m in g) counts[m.M]++;
                return counts;
            }),
            months.GroupBy(m => m.Ubigeo[..2]).ToDictionary(g => g.Key, g => g.Select(m => m.M).ToHashSet()),
            region,
            last);
    }

    /// <summary>¿Hay un episodio de El Niño costero? Para el mes actual manda el último comunicado del ENFEN; para otros, la lista del entrenamiento.</summary>
    private async Task<bool> IsNinoAsync(int year, int month, CancellationToken ct)
    {
        var now = DateTime.UtcNow.AddHours(-5);
        if (year == now.Year && month == now.Month)
        {
            var enfen = (await bulletins.ListAsync(b => b.Institution == "ENFEN", ct)).MaxBy(b => b.PublishedAt);
            if (enfen is not null)
            {
                var s = TextNormalizer.Normalize(enfen.AlertStatus);
                return s.Contains("nino") && (s.Contains("alerta") || s.Contains("vigilancia"));
            }
        }
        var key = $"{year:0000}-{month:00}";
        return model!.Meta["episodios_nino_costero"]!.AsArray()
            .Any(e => string.CompareOrdinal(key, e![0]!.GetValue<string>()) >= 0 && string.CompareOrdinal(key, e[1]!.GetValue<string>()) <= 0);
    }

    /// <summary>Predicciones para varios distritos en el mes indicado (por defecto, el actual en hora del Perú).</summary>
    public async Task<IReadOnlyDictionary<string, RiskPrediction>> PredictAsync(
        IEnumerable<string> ubigeos, int? year = null, int? month = null, CancellationToken ct = default)
    {
        if (model is null) return new Dictionary<string, RiskPrediction>();
        var now = DateTime.UtcNow.AddHours(-5);
        int y = year ?? now.Year, mo = month ?? now.Month;
        var idx = await GetIndexAsync(ct);
        var t = MonthIndex(y, mo);
        var nino = await IsNinoAsync(y, mo, ct) ? 1.0 : 0.0;

        // Fracción de años previos (t-12, t-24, …, solo hasta donde llegan los datos) con emergencia en ese mes
        double Frac(HashSet<int>? set, int target)
        {
            int years = 0, hits = 0;
            for (var j = target - 12; j >= 0; j -= 12)
            {
                if (j > idx.LastMonth) continue;
                years++;
                if (set?.Contains(j) == true) hits++;
            }
            return years == 0 ? 0 : (double)hits / years;
        }

        var result = new Dictionary<string, RiskPrediction>();
        foreach (var u in ubigeos.Distinct())
        {
            idx.DistrictMonths.TryGetValue(u, out var mine);
            idx.DeptMonths.TryGetValue(u[..2], out var dept);
            var upTo = Math.Min(t, idx.LastMonth + 1); // meses con datos antes del mes objetivo
            var before = idx.DistrictMonthCounts.TryGetValue(u, out var counts) ? counts.Take(upTo).Sum() : 0;

            double[] x =
            [
                mo,
                idx.Region.GetValueOrDefault(u, 2),
                Frac(mine, t),
                (Frac(mine, t - 1) + Frac(mine, t + 1)) / 2,
                upTo == 0 ? 0 : before / (upTo / 12.0),
                Frac(dept, t),
                nino,
            ];
            var p = model.Predict(x);
            result[u] = new RiskPrediction(u, y, mo, p, model.Level(p),
                model.Features.Select((f, i) => (f, x[i])).ToDictionary(z => z.f, z => Math.Round(z.Item2, 4)));
        }
        return result;
    }
}

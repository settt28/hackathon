using System.Text.Json.Nodes;

namespace ElNino.Core.Services;

/// <summary>
/// Evaluador de un modelo XGBoost (binary:logistic) guardado en su formato JSON nativo.
/// Recorre los árboles directamente: la IA de riesgo corre 100 % local, sin Python ni librerías extra.
/// El modelo lo entrena ml/train_risk_model.py con el historial del SINPAD.
/// </summary>
public sealed class XgbModel
{
    private sealed record Tree(int[] Left, int[] Right, int[] Feature, float[] Value);

    private readonly Tree[] _trees;
    private readonly double _baseMargin;

    public IReadOnlyList<string> Features { get; }

    /// <summary>Probabilidades a partir de las cuales el nivel pasa a moderado, alto y muy alto.</summary>
    public IReadOnlyList<double> LevelThresholds { get; }

    /// <summary>Metadatos del entrenamiento (fuente, fecha de corte, métricas) para mostrarlos con transparencia.</summary>
    public JsonObject Meta { get; }

    private XgbModel(Tree[] trees, double baseScore, JsonObject meta)
    {
        _trees = trees;
        _baseMargin = Math.Log(baseScore / (1 - baseScore));
        Meta = meta;
        Features = meta["features"]!.AsArray().Select(f => f!.GetValue<string>()).ToArray();
        LevelThresholds = meta["umbrales_nivel"]!.AsArray().Select(t => t!.GetValue<double>()).ToArray();
    }

    public static XgbModel Load(string modelPath, string metaPath)
    {
        var learner = JsonNode.Parse(File.ReadAllText(modelPath))!["learner"]!;
        var baseScore = double.Parse(learner["learner_model_param"]!["base_score"]!.GetValue<string>().Trim('[', ']'),
            System.Globalization.CultureInfo.InvariantCulture);
        var trees = learner["gradient_booster"]!["model"]!["trees"]!.AsArray().Select(t => new Tree(
            Ints(t!["left_children"]), Ints(t["right_children"]), Ints(t["split_indices"]),
            t["split_conditions"]!.AsArray().Select(v => (float)v!.GetValue<double>()).ToArray())).ToArray();
        return new XgbModel(trees, baseScore, JsonNode.Parse(File.ReadAllText(metaPath))!.AsObject());

        static int[] Ints(JsonNode? n) => n!.AsArray().Select(v => v!.GetValue<int>()).ToArray();
    }

    /// <summary>Probabilidad (0–1). XGBoost compara en float32: x &lt; umbral va a la izquierda; en las hojas, Value es el peso.</summary>
    public double Predict(IReadOnlyList<double> x)
    {
        var margin = _baseMargin;
        foreach (var t in _trees)
        {
            var n = 0;
            while (t.Left[n] != -1)
                n = (float)x[t.Feature[n]] < t.Value[n] ? t.Left[n] : t.Right[n];
            margin += t.Value[n];
        }
        return 1 / (1 + Math.Exp(-margin));
    }

    /// <summary>0 bajo · 1 moderado · 2 alto · 3 muy alto.</summary>
    public int Level(double probability) => LevelThresholds.Count(t => probability >= t);

    /// <summary>
    /// Compara con las probabilidades que calculó XGBoost en Python al entrenar.
    /// Devuelve la diferencia máxima; si supera 1e-5 el evaluador o el archivo están mal.
    /// </summary>
    public double SelfCheck(string vectorsPath) =>
        JsonNode.Parse(File.ReadAllText(vectorsPath))!.AsArray().Max(v =>
            Math.Abs(Predict(v!["x"]!.AsArray().Select(x => x!.GetValue<double>()).ToArray()) - v["p"]!.GetValue<double>()));
}

using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Models;

namespace ElNino.Core.Services;

/// <summary>
/// Triaje por reglas: detecta palabras de alarma ANTES de pasar el mensaje a la IA.
/// Ante la duda se elige el nivel más grave.
/// </summary>
public class TriageService(IRepository<AlarmKeyword> keywords)
{
    public const string SamuNumber = "106";
    public const string BomberosNumber = "116";
    public const string DefensaCivilNumber = "115";

    /// <summary>Central Única de Emergencias. Opera en Lima Metropolitana y Callao.</summary>
    public const string CentralNumber = "911";

    /// <summary>¿El distrito está donde opera el 911? Provincia de Lima (ubigeo 1501…) o Callao (07…).</summary>
    public static bool Has911(string? ubigeo) => ubigeo is not null && (ubigeo.StartsWith("1501") || ubigeo.StartsWith("07"));

    // Las mismas reglas están en frontend/src/lib/paty/engine.ts: si cambian aquí, deben cambiar allí.
    private static readonly string[] Negations = ["ya no", "no tengo", "no tiene", "no hay", "sin"];
    private static readonly string[] CrisisTerms = ["matarme", "suicid", "quitarme la vida", "no quiero vivir", "hacerme dano"];
    private static readonly string[] QuestionStarts = ["como ", "cual ", "que es ", "que hacer", "que debo hacer", "que hago si", "que pasa si", "si hay", "para prevenir"];
    private static readonly string[] ContextWords = ["prevenir", "evitar", "evito", "hubo", "ayer", "hace anos", "ano pasado", "siempre", "donar", "analisis de", "pelicula", "simulacro"];
    private static readonly string[] UrgentWords = ["ahora", "ayuda", "ayudo", "auxilio", "urgente", "rapido"];

    /// <summary>¿La persona expresa una crisis de salud mental? Nunca se rebaja: recibe la línea especializada.</summary>
    public static bool IsCrisis(string normalizedText) => CrisisTerms.Any(t => TextNormalizer.ContainsTerm(normalizedText, t));

    /// <summary>
    /// Pregunta, hipótesis o hecho pasado ("cómo prevenir un incendio", "ayer hubo un derrumbe"): no es una emergencia en curso.
    /// Salvo que pida ayuda urgente: ante la duda, se trata como emergencia.
    /// </summary>
    private static bool IsInformative(string normalizedText) =>
        !UrgentWords.Any(w => TextNormalizer.ContainsTerm(normalizedText, w)) &&
        (QuestionStarts.Any(normalizedText.StartsWith) || ContextWords.Any(w => TextNormalizer.ContainsTerm(normalizedText, w)));

    public async Task<TriageResult> EvaluateAsync(string message, CancellationToken ct = default)
    {
        var text = TextNormalizer.Normalize(message);
        var all = await keywords.GetAllAsync(ct);

        // "ya no sangra" o "no tengo fiebre" no cuentan como señal
        var matches = all
            .Select(k => (Keyword: k, Term: TextNormalizer.Normalize(k.Term)))
            .Where(x => TextNormalizer.ContainsTerm(text, x.Term) && !Negations.Any(n => text.Contains($"{n} {x.Term}", StringComparison.Ordinal)))
            .Select(x => x.Keyword)
            .ToList();

        if (matches.Count == 0)
            return new TriageResult(TriageLevel.Leve, null, null, null, []);

        var level = matches.Max(m => m.Level);
        var top = matches.Where(m => m.Level == level).ToList();

        // Si hay señales médicas y de desastre al mismo nivel, prima la médica (la vida de la persona).
        var type = top.Any(m => m.EmergencyType == EmergencyType.Medica) ? EmergencyType.Medica : EmergencyType.Desastre;
        var terms = top.Select(m => m.Term).Distinct().ToList();

        if (level != TriageLevel.Grave)
            return new TriageResult(level, type, null, null, terms);

        // Si no es una emergencia en curso baja a Moderado (sin cuenta regresiva), pero conserva el número para llamar
        var finalLevel = IsInformative(text) && !IsCrisis(text) ? TriageLevel.Moderado : level;
        return type == EmergencyType.Medica
            ? new TriageResult(finalLevel, type, SamuNumber, "SAMU – ambulancia", terms)
            : new TriageResult(finalLevel, type, BomberosNumber, "Bomberos", terms);
    }
}

using ElNino.Core.Entities;
using ElNino.Core.Interfaces;

namespace ElNino.Core.Services;

/// <summary>
/// Búsqueda de consejos por palabras clave (la "R" del RAG).
/// Con decenas o pocos cientos de consejos no hace falta una base vectorial.
/// </summary>
public class TipSearchService(IRepository<PreventionTip> tips)
{
    public async Task<IReadOnlyList<PreventionTip>> SearchAsync(
        string text, AlertDomain? domain = null, int take = 3, CancellationToken ct = default)
    {
        // "El Niño" (el fenómeno) no debe confundirse con "niño" (un menor): se une en un solo término
        var query = TextNormalizer.Normalize(text).Replace("el nino", "elnino", StringComparison.Ordinal);
        var words = TextNormalizer.Words(query);
        if (words.Length == 0) return [];

        var candidates = domain is null
            ? await tips.GetAllAsync(ct)
            : await tips.ListAsync(t => t.Domain == domain, ct);

        var phase = DetectPhase(TextNormalizer.Normalize(text));

        return candidates
            .Select(t => (Tip: t, Score: Score(t, words)))
            .Where(x => x.Score > 0)
            .Select(x => (x.Tip, Score: x.Score + (x.Tip.Phase == phase ? 2 : 0)))
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.Tip.Phase)          // a igual puntaje, primero "Antes" (prevención)
            .Take(Math.Clamp(take, 1, 20))
            .Select(x => x.Tip)
            .ToList();
    }

    private static int Score(PreventionTip tip, string[] words)
    {
        var keywords = tip.Keywords.Select(TextNormalizer.Normalize).ToArray();
        var titleWords = TextNormalizer.Words($"{tip.Title} {tip.Topic}");
        var score = 0;
        foreach (var w in words)
        {
            if (keywords.Any(k => SameStem(k, w))) score += 3;
            if (titleWords.Any(tw => SameStem(tw, w))) score += 1;
        }
        return score;
    }

    // Pistas del momento del evento en la pregunta
    private static readonly string[] AfterWords = ["despues", "paso", "regresar", "volver", "limpiar", "ya paso"];
    private static readonly string[] DuringWords = ["viene", "ahora", "entrando", "durante", "esta pasando", "tengo", "tiene"];

    /// <summary>
    /// Fase que sugiere la pregunta. Por defecto "Antes": es una app de prevención.
    /// </summary>
    private static EventPhase DetectPhase(string normalizedText)
    {
        if (AfterWords.Any(w => TextNormalizer.ContainsTerm(normalizedText, w))) return EventPhase.Despues;
        if (DuringWords.Any(w => TextNormalizer.ContainsTerm(normalizedText, w))) return EventPhase.Durante;
        return EventPhase.Antes;
    }

    /// <summary>
    /// Coincidencia exacta o por raíz común:
    /// "inundacion" ~ "inundaciones", "cultivo" ~ "cultivos", "protejo" ~ "proteger".
    /// </summary>
    private static bool SameStem(string a, string b)
    {
        if (a == b) return true;
        if (a.Length < 4 || b.Length < 4) return false;
        if (a.StartsWith(b, StringComparison.Ordinal) || b.StartsWith(a, StringComparison.Ordinal)) return true;

        var common = 0;
        while (common < a.Length && common < b.Length && a[common] == b[common]) common++;
        return common >= 5;
    }
}

using System.Globalization;
using System.Text;

namespace ElNino.Core.Services;

/// <summary>Normaliza texto en español: minúsculas, sin tildes y sin signos de puntuación.</summary>
public static class TextNormalizer
{
    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var decomposed = text.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var ch in decomposed)
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (cat == UnicodeCategory.NonSpacingMark) continue;           // quita tildes
            sb.Append(char.IsLetterOrDigit(ch) ? ch : ' ');                // quita puntuación
        }
        // Colapsa espacios múltiples
        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    // Palabras muy comunes que no aportan a la búsqueda
    private static readonly HashSet<string> StopWords =
    [
        "una", "uno", "unos", "unas", "los", "las", "del", "que", "con", "por", "para", "hay", "mis", "tus", "sus",
        "como", "donde", "cual", "cuando", "esta", "este", "esto", "estan", "muy", "mas", "pero", "sin", "sobre",
        "tengo", "tiene", "hago", "hacer", "puedo", "debo", "quiero", "algo", "ante", "entre", "hasta", "desde",
    ];

    /// <summary>Palabras significativas (más de 2 letras y que no sean muletillas) del texto normalizado.</summary>
    public static string[] Words(string? text) =>
        Normalize(text).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 2 && !StopWords.Contains(w))
            .ToArray();

    /// <summary>True si el término (puede ser una frase) aparece como palabra(s) completa(s).</summary>
    public static bool ContainsTerm(string normalizedText, string normalizedTerm) =>
        $" {normalizedText} ".Contains($" {normalizedTerm} ", StringComparison.Ordinal)
        || (normalizedTerm.Length >= 5 && normalizedText.Contains(normalizedTerm, StringComparison.Ordinal));
}

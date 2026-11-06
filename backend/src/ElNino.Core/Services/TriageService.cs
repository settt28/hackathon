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

    public async Task<TriageResult> EvaluateAsync(string message, CancellationToken ct = default)
    {
        var text = TextNormalizer.Normalize(message);
        var all = await keywords.GetAllAsync(ct);

        var matches = all
            .Where(k => TextNormalizer.ContainsTerm(text, TextNormalizer.Normalize(k.Term)))
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

        return type == EmergencyType.Medica
            ? new TriageResult(level, type, SamuNumber, "SAMU – ambulancia", terms)
            : new TriageResult(level, type, BomberosNumber, "Bomberos", terms);
    }
}

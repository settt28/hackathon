namespace ElNino.Core.Entities;

/// <summary>
/// Palabra o frase de alarma para el triaje del chatbot.
/// El triaje usa reglas (no IA) para que sea rápido y predecible.
/// </summary>
public class AlarmKeyword : BaseEntity
{
    /// <summary>Texto en minúsculas y sin tildes (ej. "no respira").</summary>
    public string Term { get; set; } = string.Empty;

    public TriageLevel Level { get; set; }
    public EmergencyType EmergencyType { get; set; }
}

namespace ElNino.Core.Entities;

/// <summary>Dominios del sistema preventivo.</summary>
public enum AlertDomain { Salud, Agricultura, Infraestructura }

/// <summary>Nivel de riesgo de una alerta.</summary>
public enum RiskLevel { Bajo, Medio, Alto, Critico }

/// <summary>
/// Alerta preventiva asociada a un dominio (Salud, Agricultura o Infraestructura).
/// </summary>
public class Alert : BaseEntity
{
    public AlertDomain Domain { get; set; }
    public RiskLevel Level { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
}

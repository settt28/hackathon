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

    /// <summary>Código de distrito INEI (ej. "150118" = Lurigancho-Chosica).</summary>
    public string Ubigeo { get; set; } = string.Empty;

    /// <summary>Peligro asociado (huaico, inundación, dengue…).</summary>
    public HazardType Hazard { get; set; } = HazardType.Otro;

    /// <summary>Quién emitió la alerta (Operador COEN, SENAMHI, Open-Meteo…).</summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>Fin de vigencia. Null = vigente hasta que se cierre.</summary>
    public DateTime? ExpiresAt { get; set; }
}

namespace ElNino.Core.Entities;

/// <summary>
/// Establecimiento de salud (posta, centro de salud u hospital) con coordenadas,
/// usado para mostrar el más cercano en el mapa offline.
/// </summary>
public class HealthCenter : BaseEntity
{
    /// <summary>Código externo (RENIPRESS u OpenStreetMap) para evitar duplicados al importar.</summary>
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    /// <summary>Categoría MINSA (I-1 … III-2) o "Sin dato".</summary>
    public string Category { get; set; } = "Sin dato";

    /// <summary>hospital | centro_salud | posta | clinica.</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>True si puede atender emergencias graves (hospital o categoría II-1 o superior).</summary>
    public bool HandlesEmergencies { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Ubigeo { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string DataSource { get; set; } = string.Empty;
}

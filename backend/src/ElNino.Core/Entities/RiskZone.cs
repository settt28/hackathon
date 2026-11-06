namespace ElNino.Core.Entities;

/// <summary>
/// Zona de riesgo o zona segura dibujada como polígono GeoJSON.
/// Sirve para el "radar geométrico": saber si la persona está dentro de una zona de peligro.
/// </summary>
public class RiskZone : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Ubigeo { get; set; } = string.Empty;
    public ZoneType ZoneType { get; set; }
    public HazardType Hazard { get; set; } = HazardType.Otro;

    /// <summary>Geometría GeoJSON (Polygon) en coordenadas [longitud, latitud].</summary>
    public string GeoJson { get; set; } = string.Empty;

    public string Source { get; set; } = string.Empty;
}

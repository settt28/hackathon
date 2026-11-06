namespace ElNino.Core.Entities;

/// <summary>
/// Distrito del Perú con su límite (polígono GeoJSON) y código de ubigeo INEI.
/// Permite saber en qué distrito está la persona a partir de su GPS.
/// </summary>
public class District : BaseEntity
{
    /// <summary>Código de ubigeo INEI de 6 dígitos (ej. "150118").</summary>
    public string Ubigeo { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;

    // Rectángulo que contiene al distrito: filtro rápido antes del cálculo exacto con el polígono
    public double MinLat { get; set; }
    public double MaxLat { get; set; }
    public double MinLon { get; set; }
    public double MaxLon { get; set; }

    /// <summary>Geometría GeoJSON (Polygon o MultiPolygon) en [longitud, latitud].</summary>
    public string GeoJson { get; set; } = string.Empty;
}

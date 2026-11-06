namespace ElNino.Core.Entities;

/// <summary>
/// Evento pasado registrado en un distrito (huaico, inundación, lluvias, epidemia…).
/// Se importan de la fuente oficial (SINPAD del INDECI, desde 2010) y con ellos se calcula el patrón de riesgo de la zona.
/// </summary>
public class HistoricalEvent : BaseEntity
{
    /// <summary>Identificador en la fuente de origen, para no duplicar al reimportar.</summary>
    public string ExternalId { get; set; } = string.Empty;

    public string Ubigeo { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public HazardType Hazard { get; set; }

    /// <summary>Tipo de evento tal como figura en la fuente (ej. "Aluvión (Huayco)").</summary>
    public string SourceEventType { get; set; } = string.Empty;

    public DateTime Date { get; set; }

    /// <summary>Precisión de la fecha: "dia", "mes" o "anio" (si solo se conoce el año, el mes no se usa en el patrón).</summary>
    public string DatePrecision { get; set; } = "dia";

    /// <summary>leve | moderado | fuerte (calculado a partir de los daños registrados).</summary>
    public string Severity { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
    public int Deaths { get; set; }
    public int Affected { get; set; }
    public int HousesDestroyed { get; set; }

    /// <summary>De dónde sale el dato (ej. "INDECI – SINPAD (emergencia 12345)").</summary>
    public string Source { get; set; } = string.Empty;
}

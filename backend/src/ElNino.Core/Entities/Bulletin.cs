namespace ElNino.Core.Entities;

/// <summary>
/// Boletín o comunicado oficial con información del momento (no son consejos fijos):
/// comunicados del ENFEN (estado de El Niño), avisos del SENAMHI, alertas epidemiológicas del MINSA,
/// reportes del INDECI… Como estas instituciones no tienen API, los registra el operador.
/// </summary>
public class Bulletin : BaseEntity
{
    /// <summary>ENFEN, SENAMHI, MINSA, INDECI, MIDAGRI…</summary>
    public string Institution { get; set; } = string.Empty;

    /// <summary>Número o código del documento (ej. "19-2026").</summary>
    public string Number { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }

    /// <summary>Estado de alerta que declara (ej. "Alerta de El Niño Costero", "No activo", "Vigilancia").</summary>
    public string AlertStatus { get; set; } = string.Empty;

    /// <summary>Resumen corto en lenguaje simple.</summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>Puntos clave o recomendaciones del documento.</summary>
    public List<string> KeyPoints { get; set; } = [];

    /// <summary>Regiones a las que aplica (vacío = todo el país).</summary>
    public List<string> Regions { get; set; } = [];

    public string Url { get; set; } = string.Empty;

    /// <summary>Fecha anunciada del próximo boletín, si se conoce.</summary>
    public DateTime? NextExpectedAt { get; set; }
}

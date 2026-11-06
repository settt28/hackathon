namespace ElNino.Core.Entities;

/// <summary>
/// Consejo preventivo basado en protocolos oficiales (MINSA, MIDAGRI, INDECI).
/// Es la base de conocimiento que usa Paty para responder.
/// </summary>
public class PreventionTip : BaseEntity
{
    public AlertDomain Domain { get; set; }

    /// <summary>Tema corto: dengue, inundacion, huaico, cultivos…</summary>
    public string Topic { get; set; } = string.Empty;

    public HazardType Hazard { get; set; } = HazardType.Otro;
    public EventPhase Phase { get; set; } = EventPhase.Antes;
    public string Title { get; set; } = string.Empty;

    /// <summary>Pasos cortos y concretos (se guardan como JSON en SQLite).</summary>
    public List<string> Steps { get; set; } = [];

    /// <summary>Palabras clave sin tildes para la búsqueda.</summary>
    public List<string> Keywords { get; set; } = [];

    /// <summary>Institución de origen: MINSA, MIDAGRI, INDECI…</summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>Documento o publicación de donde se tomó (ej. "Alerta epidemiológica N.° 008-2026").</summary>
    public string SourceDocument { get; set; } = string.Empty;

    /// <summary>Enlace al documento o a la nota oficial que lo difunde.</summary>
    public string SourceUrl { get; set; } = string.Empty;

    /// <summary>Fecha de publicación del documento de origen.</summary>
    public DateTime? SourceDate { get; set; }
}

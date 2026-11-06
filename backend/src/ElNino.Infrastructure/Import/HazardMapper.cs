using ElNino.Core.Entities;
using ElNino.Core.Services;

namespace ElNino.Infrastructure.Import;

/// <summary>
/// Traduce los nombres de peligro de las fuentes (SINPAD del INDECI) a nuestros tipos.
/// Devuelve null para peligros no relacionados con El Niño (incendios, sismos, heladas…).
/// </summary>
public static class HazardMapper
{
    public static HazardType? Map(string sourceName, string extraText = "")
    {
        // Las fuentes traen a veces caracteres dañados (U+FFFD): se tratan como espacio
        var e = TextNormalizer.Normalize(sourceName.Replace('�', ' '));
        if (e.Length == 0) return null;

        if (e.Contains("huayco") || e.Contains("huaico") || e.StartsWith("aluvi") || e.StartsWith("avenida torrencial"))
            return HazardType.Huaico;
        if (e.StartsWith("inundaci"))
            return HazardType.Inundacion;
        if (e.StartsWith("lluvia"))
            return HazardType.LluviaIntensa;
        if (e.StartsWith("deslizamiento") || e.StartsWith("derrumbe") || e.StartsWith("reptaci"))
            return HazardType.Deslizamiento;
        if (e.StartsWith("marejada") || e.StartsWith("oleaje"))
            return HazardType.Marejada;
        if (e.StartsWith("epidemia"))
            return TextNormalizer.Normalize(extraText).Contains("dengue") ? HazardType.Dengue : HazardType.Epidemia;
        return null;
    }

    /// <summary>Gravedad a partir de los daños registrados.</summary>
    public static string Severity(int deaths, int affected, int destroyed, int damaged) =>
        deaths > 0 || destroyed >= 10 || affected >= 500 ? "fuerte"
        : affected >= 50 || destroyed > 0 || damaged >= 20 ? "moderado"
        : "leve";

    public static string Describe(HazardType hazard, string district, string place, int deaths, int affected, int destroyed) =>
        Describe($"Evento de {ZoneHistoryService.HazardName(hazard)}", district, place, deaths, affected, destroyed);

    /// <summary>Ej: "Huayco en Lurigancho: 120 personas afectadas o damnificadas, 3 viviendas destruidas."</summary>
    public static string Describe(string label, string district, string place, int deaths, int affected, int destroyed)
    {
        var text = string.IsNullOrEmpty(place) ? $"{label} en {district}" : $"{label} en {place} ({district})";
        var damages = new List<string>();
        if (deaths > 0) damages.Add($"{deaths} fallecido(s)");
        if (affected > 0) damages.Add($"{affected} personas afectadas o damnificadas");
        if (destroyed > 0) damages.Add($"{destroyed} viviendas destruidas");
        return damages.Count > 0 ? $"{text}: {string.Join(", ", damages)}." : $"{text}.";
    }
}

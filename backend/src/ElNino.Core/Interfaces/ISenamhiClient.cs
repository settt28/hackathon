using ElNino.Core.Models;

namespace ElNino.Core.Interfaces;

/// <summary>
/// Acceso a la información pública del SENAMHI (pronóstico por ciudad y avisos meteorológicos).
/// La implementación (Infrastructure) lee la web del SENAMHI y guarda en caché.
/// </summary>
public interface ISenamhiClient
{
    /// <summary>Pronóstico de las ciudades de un departamento (ej. "piura", "la-libertad").</summary>
    Task<IReadOnlyList<CityForecast>> GetForecastAsync(string departmentSlug, CancellationToken ct = default);

    /// <summary>Avisos meteorológicos recientes (vigentes, emitidos y finalizados).</summary>
    Task<IReadOnlyList<WeatherWarning>> GetWarningsAsync(CancellationToken ct = default);
}

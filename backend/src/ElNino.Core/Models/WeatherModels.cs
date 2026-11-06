namespace ElNino.Core.Models;

/// <summary>Pronóstico de un día para una ciudad (SENAMHI).</summary>
public record DayForecast(DateOnly Date, int? MaxC, int? MinC, string Description);

/// <summary>Pronóstico de varios días para una ciudad de un departamento (SENAMHI).</summary>
public record CityForecast(string City, string Department, IReadOnlyList<DayForecast> Days);

/// <summary>Aviso meteorológico del SENAMHI (lluvias, temperatura, friaje, vientos…).</summary>
/// <param name="Status">vigente | emitido (aún no empieza) | finalizado | cancelado</param>
/// <param name="Level">AMARILLO | NARANJA | ROJO</param>
/// <param name="Details">Pronóstico por día que trae el aviso (acumulados, temperaturas…).</param>
public record WeatherWarning(
    int Number,
    string Title,
    string Level,
    string Status,
    DateOnly IssuedAt,
    DateOnly StartsAt,
    DateOnly EndsAt,
    string Summary,
    IReadOnlyList<string> Details,
    string Url);

/// <summary>Aviso con la evaluación de si podría afectar la zona del usuario.</summary>
/// <param name="Relevance">alta (menciona el departamento) | media (menciona su región natural/zona) | baja</param>
public record WarningForLocation(WeatherWarning Warning, bool AffectsYourArea, string Relevance, string Reason);

/// <summary>Pronóstico para la ubicación del usuario.</summary>
/// <param name="City">Ciudad del SENAMHI usada (la más cercana en el departamento).</param>
/// <param name="Forecast">Pronóstico del día más próximo publicado (hoy, o mañana si el SENAMHI ya actualizó).</param>
/// <param name="IsToday">true si <paramref name="Forecast"/> es de hoy.</param>
public record LocalForecast(
    string District,
    string Department,
    string City,
    double? CityDistanceKm,
    DayForecast? Forecast,
    bool IsToday,
    IReadOnlyList<DayForecast> NextDays,
    string Source,
    string Url);

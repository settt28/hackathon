using ElNino.Core.Entities;

namespace ElNino.Core.Models;

/// <summary>Establecimiento de salud con su distancia al usuario.</summary>
public record NearbyHealthCenter(HealthCenter Center, double DistanceKm, int WalkingMinutes);

/// <summary>Resultado del triaje por reglas.</summary>
public record TriageResult(
    TriageLevel Level,
    EmergencyType? EmergencyType,
    string? PhoneNumber,
    string? PhoneLabel,
    IReadOnlyList<string> MatchedTerms);

/// <summary>Patrón histórico de un tipo de peligro en una zona.</summary>
public record HazardPattern(
    HazardType Hazard,
    int Occurrences,
    IReadOnlyList<int> Years,
    double? AverageIntervalYears,
    IReadOnlyList<string> FrequentMonths,
    int LastYear,
    bool InSeason,
    string Warning);

/// <summary>Historial y resumen de riesgo de un distrito.</summary>
/// <param name="Coverage">Cuántos registros hay, de qué años y de qué fuente (para ser transparentes con el usuario).</param>
/// <param name="Events">Eventos más recientes (limitados).</param>
public record ZoneRiskSummary(
    string Ubigeo,
    string District,
    string Coverage,
    IReadOnlyList<HazardPattern> Hazards,
    IReadOnlyList<HistoricalEvent> Events);

/// <summary>Mensaje que el frontend envía a Paty.</summary>
public record PatyRequest(
    string Message,
    string? Ubigeo = null,
    AlertDomain? Domain = null,
    double? Latitude = null,
    double? Longitude = null);

/// <summary>Acción que el frontend puede mostrar como botón (llamar, ver mapa…).</summary>
public record PatyAction(string Type, string Label, string? Value = null);

/// <summary>Consejo resumido citado en la respuesta.</summary>
public record TipReference(Guid Id, string Title, AlertDomain Domain, string Source, IReadOnlyList<string> Steps,
    string SourceDocument, string SourceUrl, DateTime? SourceDate);

/// <summary>Respuesta completa de Paty.</summary>
/// <param name="Location">Distrito detectado a partir del GPS (o null si no se envió ubicación ni ubigeo).</param>
public record PatyReply(
    string Reply,
    ElNino.Core.Services.DistrictLocation? Location,
    TriageResult Triage,
    IReadOnlyList<TipReference> Tips,
    IReadOnlyList<string> ZoneWarnings,
    IReadOnlyList<string> OfficialNotices,
    IReadOnlyList<NearbyHealthCenter> NearestCenters,
    IReadOnlyList<PatyAction> Actions,
    bool UsedAi);

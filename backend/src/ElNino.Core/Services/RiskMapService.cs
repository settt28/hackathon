using System.Globalization;
using System.Text.Json.Nodes;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;

namespace ElNino.Core.Services;

/// <summary>
/// Zonas de riesgo dinámicas: calcula, para cada distrito alrededor de la persona, un NIVEL DE RIESGO ESTIMADO
/// que cambia con lo que está pasando ahora.
///
///   nivel = riesgo histórico (emergencias del INDECI desde 2010, ponderadas por daño)
///         + temporada (estamos en los meses en que suelen ocurrir)
///         + avisos de lluvia del SENAMHI que afectan al distrito (naranja +1, rojo +2; la mitad si solo nombran la región)
///         y como mínimo el nivel de las alertas publicadas por el operador.
///
/// Es una estimación propia que combina datos oficiales; NO es una predicción oficial.
/// </summary>
public class RiskMapService(
    IRepository<District> districts,
    IRepository<HistoricalEvent> events,
    IAlertRepository alerts,
    IRepository<Bulletin> bulletins,
    WeatherService weather)
{
    public const int RefreshSeconds = 600;
    private const int MaxDistricts = 200;

    // Peligros asociados a El Niño que cuentan para el riesgo de la zona
    private static readonly HazardType[] Hazards =
        [HazardType.Huaico, HazardType.Inundacion, HazardType.LluviaIntensa, HazardType.Deslizamiento];

    // Umbrales del puntaje histórico (suma de gravedades desde 2010: leve 1, moderado 2, fuerte 3).
    // Calibrados con la distribución nacional del SINPAD (nov. 2026): mediana ≈ 35, percentil 75 ≈ 61, percentil 90 ≈ 105.
    private const int ModerateFrom = 20, HighFrom = 60, VeryHighFrom = 105;

    private static readonly (string Label, string Color)[] Levels =
    [
        ("bajo", "#22c55e"), ("moderado", "#eab308"), ("alto", "#f97316"), ("muy alto", "#dc2626"),
    ];

    private static readonly CultureInfo Es = new("es-PE");

    public async Task<JsonObject> BuildAsync(double lat, double lon, double radiusKm, bool includeWeather, CancellationToken ct = default)
    {
        radiusKm = Math.Clamp(radiusKm, 1, 100);
        var now = DateTime.UtcNow.AddHours(-5); // hora del Perú

        // 1) Distritos alrededor (por rectángulo) + el distrito donde está la persona
        var dLat = radiusKm / 111.0;
        var dLon = radiusKm / (111.0 * Math.Max(0.2, Math.Cos(lat * Math.PI / 180)));
        var near = (await districts.ListAsync(d =>
                d.MaxLat >= lat - dLat && d.MinLat <= lat + dLat && d.MaxLon >= lon - dLon && d.MinLon <= lon + dLon, ct))
            .Select(d => (D: d, Km: GeoUtils.HaversineKm(lat, lon, (d.MinLat + d.MaxLat) / 2, (d.MinLon + d.MaxLon) / 2)))
            .OrderBy(x => x.Km)
            .Take(MaxDistricts)
            .Select(x => x.D)
            .ToList();
        var mine = near.FirstOrDefault(d => d.MinLat <= lat && d.MaxLat >= lat && d.MinLon <= lon && d.MaxLon >= lon &&
                                           GeoUtils.IsPointInGeoJson(d.GeoJson, lat, lon));

        // 2) Historial de todos esos distritos en una sola consulta
        var ubigeos = near.Select(d => d.Ubigeo).ToList();
        var history = (await events.ListAsync(e => ubigeos.Contains(e.Ubigeo) && Hazards.Contains(e.Hazard), ct))
            .GroupBy(e => e.Ubigeo)
            .ToDictionary(g => g.Key, g => g.ToList());

        // 3) Alertas vigentes del operador, por distrito
        var activeAlerts = (await alerts.GetActiveAsync(null, null, ct))
            .Where(a => ubigeos.Contains(a.Ubigeo))
            .GroupBy(a => a.Ubigeo)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => a.Level).First());

        // 4) Estado de El Niño (solo como contexto)
        var enfen = (await bulletins.ListAsync(b => b.Institution == "ENFEN", ct)).OrderByDescending(b => b.PublishedAt).FirstOrDefault();

        var weatherAvailable = includeWeather;
        var features = new JsonArray();
        foreach (var d in near)
        {
            var evs = history.GetValueOrDefault(d.Ubigeo) ?? [];
            var reasons = new List<string>();

            // --- Riesgo histórico
            var score = evs.Sum(e => e.Severity switch { "fuerte" => 3, "moderado" => 2, _ => 1 });
            var level = score >= VeryHighFrom ? 3 : score >= HighFrom ? 2 : score >= ModerateFrom ? 1 : 0;
            var byHazard = evs.GroupBy(e => e.Hazard).OrderByDescending(g => g.Count()).ToList();
            var main = byHazard.FirstOrDefault()?.Key;
            if (evs.Count > 0)
                reasons.Add($"{evs.Count} emergencias registradas desde 2010 " +
                            $"({string.Join(", ", byHazard.Take(3).Select(g => $"{g.Count()} {ZoneHistoryService.HazardName(g.Key)}"))}).");
            else
                reasons.Add("Sin emergencias registradas desde 2010 (eso no significa que sea una zona segura).");

            // --- Temporada: meses con más eventos (solo los que tienen mes conocido)
            var topMonths = evs.Where(e => e.DatePrecision != "anio")
                .GroupBy(e => e.Date.Month).OrderByDescending(g => g.Count()).Take(2).Select(g => g.Key).ToList();
            var inSeason = evs.Count >= 3 && topMonths.Any(m => m == now.Month || m == now.AddMonths(1).Month);
            if (inSeason && level >= 1)
            {
                level++;
                reasons.Add($"Estamos en temporada: aquí suele haber emergencias en {string.Join(" y ", topMonths.Select(m => Es.DateTimeFormat.GetMonthName(m).ToLowerInvariant()))}.");
            }

            // --- Avisos de lluvia del SENAMHI que afectan al distrito
            JsonObject? warningJson = null;
            if (weatherAvailable)
            {
                try
                {
                    var rain = (await weather.GetWarningsAsync(d, false, ct))
                        .Where(w => w.AffectsYourArea && IsRainWarning(w.Warning.Title))
                        .Where(w => w.Warning.Status == "vigente" || w.Warning.StartsAt.DayNumber - DateOnly.FromDateTime(now).DayNumber <= 2)
                        .OrderByDescending(w => LevelPoints(w.Warning.Level))
                        .FirstOrDefault();
                    if (rain is not null)
                    {
                        var pts = LevelPoints(rain.Warning.Level);
                        // Si el aviso nombra el departamento pesa completo (naranja +1, rojo +2);
                        // si solo nombra la región ("costa y sierra"), pesa la mitad (rojo +1).
                        level += rain.Relevance == "alta"
                            ? pts switch { 3 => 2, 2 => 1, _ => 0 }
                            : pts switch { 3 => 1, _ => 0 };
                        if (level == 0 && pts >= 2) level = 1; // lluvias fuertes aunque no haya historial
                        reasons.Add($"Aviso {rain.Warning.Level.ToLowerInvariant()} del SENAMHI N.° {rain.Warning.Number}: {rain.Warning.Title.ToLowerInvariant()} ({rain.Relevance}: {rain.Reason})");
                        warningJson = new JsonObject
                        {
                            ["numero"] = rain.Warning.Number,
                            ["nivel"] = rain.Warning.Level,
                            ["titulo"] = rain.Warning.Title,
                            ["estado"] = rain.Warning.Status,
                            ["fin"] = rain.Warning.EndsAt.ToString("yyyy-MM-dd"),
                        };
                    }
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
                {
                    weatherAvailable = false; // sin conexión con el SENAMHI: se sigue solo con historial y alertas
                }
            }

            // --- Alertas del operador: fijan un nivel mínimo
            JsonObject? alertJson = null;
            if (activeAlerts.TryGetValue(d.Ubigeo, out var alert))
            {
                var floor = alert.Level switch { RiskLevel.Critico => 3, RiskLevel.Alto => 2, RiskLevel.Medio => 1, _ => 0 };
                level = Math.Max(level, floor);
                reasons.Add($"Alerta vigente: {alert.Title}.");
                alertJson = new JsonObject { ["titulo"] = alert.Title, ["nivel"] = alert.Level.ToString() };
            }

            level = Math.Clamp(level, 0, 3);
            if (TryParse(d.GeoJson) is not { } geometry) continue;

            features.Add(new JsonObject
            {
                ["type"] = "Feature",
                ["geometry"] = geometry,
                ["properties"] = new JsonObject
                {
                    ["capa"] = "riesgo_distrito",
                    ["ubigeo"] = d.Ubigeo,
                    ["nombre"] = d.Name,
                    ["provincia"] = d.Province,
                    ["departamento"] = d.Department,
                    ["regionNatural"] = d.NaturalRegion,
                    ["esTuDistrito"] = mine?.Ubigeo == d.Ubigeo,
                    ["nivel"] = Levels[level].Label,
                    ["nivelNumero"] = level,
                    ["color"] = Levels[level].Color,
                    ["peligroPrincipal"] = main is null ? null : ZoneHistoryService.HazardName(main.Value),
                    ["emergenciasDesde2010"] = evs.Count,
                    ["puntajeHistorico"] = score,
                    ["enTemporada"] = inSeason,
                    ["avisoSenamhi"] = warningJson,
                    ["alerta"] = alertJson,
                    ["razones"] = new JsonArray(reasons.Select(r => (JsonNode)JsonValue.Create(r)!).ToArray()),
                },
            });
        }

        return new JsonObject
        {
            ["type"] = "FeatureCollection",
            ["features"] = features,
            ["centro"] = new JsonArray(lon, lat),
            ["radioKm"] = radiusKm,
            ["tuDistrito"] = mine is null ? null : new JsonObject { ["ubigeo"] = mine.Ubigeo, ["nombre"] = mine.Name, ["departamento"] = mine.Department },
            ["leyenda"] = new JsonArray(Levels.Select((l, i) => (JsonNode)new JsonObject { ["nivel"] = l.Label, ["nivelNumero"] = i, ["color"] = l.Color }).ToArray()),
            ["estadoElNino"] = enfen is null ? null : $"{enfen.AlertStatus} ({enfen.Title}, {enfen.PublishedAt:dd/MM/yyyy})",
            ["senamhiDisponible"] = weatherAvailable,
            ["generadoEn"] = DateTime.UtcNow,
            ["actualizarCadaSegundos"] = RefreshSeconds,
            ["aviso"] = "Nivel de riesgo ESTIMADO a partir de datos oficiales (INDECI, SENAMHI); no es una predicción oficial.",
            ["metodologia"] = "Historial INDECI-SINPAD desde 2010 ponderado por daño + temporada + avisos de lluvia del SENAMHI (si nombran el departamento: naranja +1, rojo +2; si solo nombran la región: rojo +1) + alertas vigentes como nivel mínimo.",
        };
    }

    private static bool IsRainWarning(string title)
    {
        var t = TextNormalizer.Normalize(title);
        return t.Contains("precipitacion") || t.Contains("lluvia") || t.Contains("nevada") || t.Contains("granizo");
    }

    private static int LevelPoints(string level) => level.ToUpperInvariant() switch
    {
        "ROJO" => 3, "NARANJA" => 2, "AMARILLO" => 1, _ => 0,
    };

    private static JsonNode? TryParse(string geoJson)
    {
        if (string.IsNullOrWhiteSpace(geoJson)) return null;
        try { return JsonNode.Parse(geoJson); }
        catch (System.Text.Json.JsonException) { return null; }
    }
}

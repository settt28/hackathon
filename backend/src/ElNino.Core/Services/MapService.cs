using System.Text.Json;
using System.Text.Json.Nodes;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;

namespace ElNino.Core.Services;

/// <summary>
/// Arma, en una sola respuesta GeoJSON (FeatureCollection), todo lo que va en el mapa alrededor de la persona:
/// su ubicación, establecimientos de salud, límite del distrito, zonas de riesgo/seguras,
/// más las alertas vigentes y los avisos del SENAMHI de su zona.
/// Se puede dibujar directo con Leaflet (L.geoJSON) filtrando por la propiedad "capa".
/// </summary>
public class MapService(
    IRepository<HealthCenter> centers,
    IRepository<RiskZone> zones,
    IAlertRepository alerts,
    DistrictService districts,
    HealthCenterService healthCenters,
    WeatherService weather)
{
    /// <summary>Cada cuánto conviene que el frontend vuelva a pedir el mapa (alertas y avisos cambian).</summary>
    public const int RefreshSeconds = 300;

    private const int MaxCenters = 300;
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    public async Task<JsonObject> BuildAsync(double lat, double lon, double radiusKm, bool includeWeather, CancellationToken ct = default)
    {
        radiusKm = Math.Clamp(radiusKm, 0.5, 50);
        var features = new JsonArray();

        // 1) Ubicación de la persona y su distrito
        features.Add(PointFeature(lat, lon, new JsonObject { ["capa"] = "ubicacion", ["nombre"] = "Tu ubicación" }));

        var location = await districts.LocateAsync(lat, lon, ct);
        var district = location is null ? null : await districts.GetByUbigeoAsync(location.Ubigeo, ct);
        if (district is not null && TryParse(district.GeoJson) is { } districtGeometry)
        {
            features.Add(Feature(districtGeometry, new JsonObject
            {
                ["capa"] = "distrito",
                ["ubigeo"] = district.Ubigeo,
                ["nombre"] = district.Name,
                ["provincia"] = district.Province,
                ["departamento"] = district.Department,
                ["regionNatural"] = district.NaturalRegion,
            }));
        }

        // 2) Establecimientos de salud dentro del radio (y siempre el más cercano y el más cercano con emergencias)
        var nearest = (await healthCenters.GetNearestAsync(lat, lon, 1, false, ct)).FirstOrDefault();
        var nearestEmergency = (await healthCenters.GetNearestAsync(lat, lon, 1, true, ct)).FirstOrDefault();

        var dLat = radiusKm / 111.0;
        var dLon = radiusKm / (111.0 * Math.Max(0.2, Math.Cos(lat * Math.PI / 180)));
        var inBox = await centers.ListAsync(c =>
            c.Latitude > lat - dLat && c.Latitude < lat + dLat && c.Longitude > lon - dLon && c.Longitude < lon + dLon, ct);

        var inRadius = inBox
            .Select(c => (Center: c, Km: GeoUtils.HaversineKm(lat, lon, c.Latitude, c.Longitude)))
            .Where(x => x.Km <= radiusKm)
            .OrderBy(x => x.Km)
            .Take(MaxCenters)
            .ToList();
        foreach (var extra in new[] { nearest, nearestEmergency })
            if (extra is not null && inRadius.All(x => x.Center.Id != extra.Center.Id))
                inRadius.Add((extra.Center, extra.DistanceKm));

        foreach (var (c, km) in inRadius)
        {
            features.Add(PointFeature(c.Latitude, c.Longitude, new JsonObject
            {
                ["capa"] = "centro_salud",
                ["id"] = c.Id.ToString(),
                ["nombre"] = c.Name,
                ["tipo"] = c.Type,
                ["categoria"] = c.Category,
                ["atiendeEmergencias"] = c.HandlesEmergencies,
                ["telefono"] = c.Phone,
                ["distrito"] = c.District,
                ["distanciaKm"] = Math.Round(km, 2),
                ["minutosCaminando"] = GeoUtils.WalkingMinutes(km),
                ["masCercano"] = nearest?.Center.Id == c.Id,
                ["masCercanoConEmergencias"] = nearestEmergency?.Center.Id == c.Id,
            }));
        }

        // 3) Zonas de riesgo y seguras del distrito, y las que contienen el punto
        List<RiskZone> zoneList = district is null ? [] : (await zones.ListAsync(z => z.Ubigeo == district.Ubigeo, ct)).ToList();
        foreach (var z in (await zones.GetAllAsync(ct)).Where(z => GeoUtils.IsPointInGeoJson(z.GeoJson, lat, lon)))
            if (zoneList.All(x => x.Id != z.Id)) zoneList.Add(z);

        var insideRisk = new List<string>();
        foreach (var z in zoneList)
        {
            var inside = GeoUtils.IsPointInGeoJson(z.GeoJson, lat, lon);
            if (inside && z.ZoneType == ZoneType.Riesgo) insideRisk.Add(z.Name);
            if (TryParse(z.GeoJson) is not { } geometry) continue;
            features.Add(Feature(geometry, new JsonObject
            {
                ["capa"] = z.ZoneType == ZoneType.Riesgo ? "zona_riesgo" : "zona_segura",
                ["id"] = z.Id.ToString(),
                ["nombre"] = z.Name,
                ["peligro"] = z.Hazard.ToString(),
                ["estasDentro"] = inside,
                ["fuente"] = z.Source,
            }));
        }

        // 4) Alertas vigentes del distrito (no tienen coordenadas: van como lista, no como figura)
        IReadOnlyList<Alert> activeAlerts = district is null ? [] : await alerts.GetActiveAsync(district.Ubigeo, null, ct);
        var alertsJson = new JsonArray(activeAlerts.Select(a => (JsonNode)new JsonObject
        {
            ["id"] = a.Id.ToString(),
            ["titulo"] = a.Title,
            ["descripcion"] = a.Description,
            ["dominio"] = a.Domain.ToString(),
            ["nivel"] = a.Level.ToString(),
            ["peligro"] = a.Hazard.ToString(),
            ["venceEn"] = a.ExpiresAt,
            ["fuente"] = a.Source,
        }).ToArray());

        // 5) Avisos del SENAMHI que afectan la zona (requiere internet; si falla, el mapa sale igual)
        JsonNode? weatherNode = null;
        if (includeWeather)
        {
            try
            {
                var warnings = (await weather.GetWarningsAsync(district, false, ct)).Where(w => w.AffectsYourArea).ToList();
                weatherNode = new JsonArray(warnings.Select(w => (JsonNode)new JsonObject
                {
                    ["numero"] = w.Warning.Number,
                    ["titulo"] = w.Warning.Title,
                    ["nivel"] = w.Warning.Level,
                    ["estado"] = w.Warning.Status,
                    ["inicio"] = w.Warning.StartsAt.ToString("yyyy-MM-dd"),
                    ["fin"] = w.Warning.EndsAt.ToString("yyyy-MM-dd"),
                    ["resumen"] = w.Warning.Summary,
                    ["relevancia"] = w.Relevance,
                    ["url"] = w.Warning.Url,
                }).ToArray());
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                weatherNode = null; // sin conexión con el SENAMHI: el resto del mapa no depende de esto
            }
        }

        return new JsonObject
        {
            ["type"] = "FeatureCollection",
            ["features"] = features,
            // Miembros adicionales (permitidos por GeoJSON): datos que no son figuras del mapa
            ["centro"] = new JsonArray(lon, lat),
            ["radioKm"] = radiusKm,
            ["ubicacion"] = location is null ? null : JsonSerializer.SerializeToNode(location, WebJson),
            ["enZonaDeRiesgo"] = insideRisk.Count > 0,
            ["zonasDeRiesgoDondeEstas"] = new JsonArray(insideRisk.Select(n => (JsonNode)JsonValue.Create(n)!).ToArray()),
            ["alertas"] = alertsJson,
            ["avisosSenamhi"] = weatherNode,
            ["telefonos"] = new JsonObject { ["samu"] = "106", ["bomberos"] = "116", ["defensaCivil"] = "115", ["policia"] = "105" },
            ["generadoEn"] = DateTime.UtcNow,
            ["actualizarCadaSegundos"] = RefreshSeconds,
            ["fuentes"] = "Establecimientos: OpenStreetMap (ODbL). Límites: INEI. Avisos: SENAMHI. Alertas: operador.",
        };
    }

    private static JsonObject PointFeature(double lat, double lon, JsonObject props) =>
        Feature(new JsonObject { ["type"] = "Point", ["coordinates"] = new JsonArray(lon, lat) }, props);

    private static JsonObject Feature(JsonNode geometry, JsonObject props) =>
        new() { ["type"] = "Feature", ["geometry"] = geometry, ["properties"] = props };

    private static JsonNode? TryParse(string geoJson)
    {
        if (string.IsNullOrWhiteSpace(geoJson)) return null;
        try { return JsonNode.Parse(geoJson); }
        catch (JsonException) { return null; }
    }
}

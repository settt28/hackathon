using System.Text.Json;

namespace ElNino.Core.Services;

/// <summary>Cálculos geográficos sin dependencias externas.</summary>
public static class GeoUtils
{
    private const double EarthRadiusKm = 6371.0;

    /// <summary>Distancia en km entre dos puntos (fórmula de Haversine).</summary>
    public static double HaversineKm(double lat1, double lon1, double lat2, double lon2)
    {
        static double Rad(double deg) => deg * Math.PI / 180.0;
        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return EarthRadiusKm * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    /// <summary>Minutos aproximados caminando (5 km/h).</summary>
    public static int WalkingMinutes(double km) => (int)Math.Ceiling(km / 5.0 * 60);

    /// <summary>
    /// "Radar geométrico": true si el punto está dentro de un Polygon/MultiPolygon GeoJSON.
    /// Acepta una geometría, un Feature o un FeatureCollection. Coordenadas en [lon, lat].
    /// </summary>
    public static bool IsPointInGeoJson(string geoJson, double lat, double lon)
    {
        if (string.IsNullOrWhiteSpace(geoJson)) return false;
        try
        {
            using var doc = JsonDocument.Parse(geoJson);
            return ContainsPoint(doc.RootElement, lat, lon);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool ContainsPoint(JsonElement el, double lat, double lon)
    {
        var type = el.TryGetProperty("type", out var t) ? t.GetString() : null;
        switch (type)
        {
            case "FeatureCollection":
                return el.GetProperty("features").EnumerateArray().Any(f => ContainsPoint(f, lat, lon));
            case "Feature":
                return el.TryGetProperty("geometry", out var g) && ContainsPoint(g, lat, lon);
            case "Polygon":
                return PolygonContains(el.GetProperty("coordinates"), lat, lon);
            case "MultiPolygon":
                return el.GetProperty("coordinates").EnumerateArray().Any(p => PolygonContains(p, lat, lon));
            default:
                return false;
        }
    }

    /// <summary>Anillo exterior debe contener el punto y ningún agujero (anillos siguientes) debe contenerlo.</summary>
    private static bool PolygonContains(JsonElement rings, double lat, double lon)
    {
        var ringList = rings.EnumerateArray().ToList();
        if (ringList.Count == 0 || !RingContains(ringList[0], lat, lon)) return false;
        return !ringList.Skip(1).Any(hole => RingContains(hole, lat, lon));
    }

    /// <summary>Algoritmo de ray casting sobre un anillo [[lon, lat], …].</summary>
    private static bool RingContains(JsonElement ring, double lat, double lon)
    {
        var pts = ring.EnumerateArray().Select(p => (X: p[0].GetDouble(), Y: p[1].GetDouble())).ToArray();
        var inside = false;
        for (int i = 0, j = pts.Length - 1; i < pts.Length; j = i++)
        {
            var (xi, yi) = pts[i];
            var (xj, yj) = pts[j];
            if ((yi > lat) != (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
                inside = !inside;
        }
        return inside;
    }
}

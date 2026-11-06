using ElNino.Core.Entities;
using ElNino.Core.Interfaces;

namespace ElNino.Core.Services;

/// <summary>Resultado de ubicar un punto GPS en un distrito.</summary>
public record DistrictLocation(
    string Ubigeo,
    string District,
    string Province,
    string Department,
    bool Exact,
    double? DistanceKm);

/// <summary>
/// Convierte coordenadas GPS en distrito (ubigeo INEI) usando los límites distritales.
/// 1) filtra por rectángulo, 2) comprueba el polígono exacto,
/// 3) si el punto cae en un hueco del mapa (costa, límites), devuelve el distrito más cercano marcado como aproximado.
/// </summary>
public class DistrictService(IRepository<District> districts)
{
    private const double FallbackBoxDegrees = 0.15; // ~16 km

    public async Task<DistrictLocation?> LocateAsync(double lat, double lon, CancellationToken ct = default)
    {
        var candidates = await districts.ListAsync(d =>
            d.MinLat <= lat && d.MaxLat >= lat && d.MinLon <= lon && d.MaxLon >= lon, ct);

        var exact = candidates.FirstOrDefault(d => GeoUtils.IsPointInGeoJson(d.GeoJson, lat, lon));
        if (exact is not null)
            return ToLocation(exact, true, null);

        // Aproximación: distrito cuyo centro (del rectángulo) esté más cerca
        var near = await districts.ListAsync(d =>
            d.MinLat <= lat + FallbackBoxDegrees && d.MaxLat >= lat - FallbackBoxDegrees &&
            d.MinLon <= lon + FallbackBoxDegrees && d.MaxLon >= lon - FallbackBoxDegrees, ct);

        var best = near
            .Select(d => (D: d, Km: GeoUtils.HaversineKm(lat, lon, (d.MinLat + d.MaxLat) / 2, (d.MinLon + d.MaxLon) / 2)))
            .OrderBy(x => x.Km)
            .FirstOrDefault();

        return best.D is null ? null : ToLocation(best.D, false, Math.Round(best.Km, 1));
    }

    public async Task<District?> GetByUbigeoAsync(string ubigeo, CancellationToken ct = default) =>
        (await districts.ListAsync(d => d.Ubigeo == ubigeo, ct)).FirstOrDefault();

    private static DistrictLocation ToLocation(District d, bool exact, double? km) =>
        new(d.Ubigeo, d.Name, d.Province, d.Department, exact, km);
}

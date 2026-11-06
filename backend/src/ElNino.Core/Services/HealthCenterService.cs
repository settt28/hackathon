using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Models;

namespace ElNino.Core.Services;

/// <summary>Busca los establecimientos de salud más cercanos a una ubicación.</summary>
public class HealthCenterService(IRepository<HealthCenter> centers)
{
    // Radios de búsqueda en grados (~22 km, ~55 km, ~165 km). Si no hay nada cerca, se amplía.
    private static readonly double[] SearchBoxes = [0.2, 0.5, 1.5];

    public async Task<IReadOnlyList<NearbyHealthCenter>> GetNearestAsync(
        double lat, double lon, int take = 5, bool emergencyOnly = false, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 50);

        foreach (var d in SearchBoxes)
        {
            var candidates = await centers.ListAsync(c =>
                c.Latitude > lat - d && c.Latitude < lat + d &&
                c.Longitude > lon - d && c.Longitude < lon + d &&
                (!emergencyOnly || c.HandlesEmergencies), ct);

            if (candidates.Count > 0)
                return Rank(candidates, lat, lon, take);
        }

        // Último recurso: todo el catálogo (zonas muy alejadas)
        var all = await centers.ListAsync(c => !emergencyOnly || c.HandlesEmergencies, ct);
        return Rank(all, lat, lon, take);
    }

    private static IReadOnlyList<NearbyHealthCenter> Rank(IEnumerable<HealthCenter> list, double lat, double lon, int take) =>
        list.Select(c =>
            {
                var km = Math.Round(GeoUtils.HaversineKm(lat, lon, c.Latitude, c.Longitude), 2);
                return new NearbyHealthCenter(c, km, GeoUtils.WalkingMinutes(km));
            })
            .OrderBy(x => x.DistanceKm)
            .Take(take)
            .ToList();
}

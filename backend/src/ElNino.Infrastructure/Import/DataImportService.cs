using ElNino.Core.Entities;
using ElNino.Core.Services;
using ElNino.Infrastructure.Persistence;
using ElNino.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace ElNino.Infrastructure.Import;

/// <summary>
/// Orquesta la carga de datos reales: límites distritales y emergencias del SINPAD (INDECI) desde 2010.
/// Se usa al arrancar (si la BD está vacía) y desde el endpoint de administración para actualizar.
/// </summary>
public class DataImportService(
    AppDbContext db,
    DataImportOptions options,
    DistrictImporter districts,
    SinpadImporter sinpad,
    IMemoryCache cache,
    ILogger<DataImportService> logger)
{
    /// <summary>Claves de caché de las estadísticas nacionales (EstadisticasController: "estadisticas:{años}", 1 a 15).</summary>
    private static IEnumerable<string> StatsKeys => Enumerable.Range(1, 15).Select(n => $"estadisticas:{n}");

    public async Task<int> ImportDistrictsAsync(CancellationToken ct = default)
    {
        var path = options.Resolve(options.DistrictsGeoJsonPath);
        if (!File.Exists(path)) throw new FileNotFoundException($"No se encontró el archivo de distritos: {path}");

        var count = await districts.ImportAsync(path, ct);
        logger.LogInformation("Distritos importados: {Count}", count);
        await AssignHealthCenterDistrictsAsync(ct);
        // Distritos y postas (su distrito cambió) se vuelven a leer de la base en la próxima petición
        CachedRepository<District>.Invalidate<District>(cache);
        CachedRepository<HealthCenter>.Invalidate<HealthCenter>(cache);
        return count;
    }

    /// <summary>
    /// Importa el historial de eventos (desde HistoryMinYear). Con <paramref name="download"/> = true primero
    /// descarga la versión más reciente publicada por el INDECI y actualiza el zip local.
    /// </summary>
    public async Task<ImportResult> ImportHistoryAsync(bool download, CancellationToken ct = default)
    {
        var zipPath = options.Resolve(options.SinpadZipPath);

        if (download)
        {
            logger.LogInformation("Descargando SINPAD (INDECI)…");
            await SinpadImporter.DownloadAsync(options.SinpadDownloadUrls, zipPath, ct);
        }

        var r = await sinpad.ImportAsync(zipPath, options.HistoryMinYear, ct);
        // El historial nuevo se ve al instante: tabla en memoria y estadísticas nacionales (caché de 1 h) fuera
        CachedRepository<HistoricalEvent>.Invalidate<HistoricalEvent>(cache);
        CachedRepository<District>.Invalidate<District>(cache); // el importador completa la región natural de cada distrito
        foreach (var key in StatsKeys) cache.Remove(key);
        logger.LogInformation("Historial {Source}: {Imported} eventos importados ({Min}–{Max}) de {Read} registros leídos",
            r.Source, r.Imported, r.MinYear, r.MaxYear, r.Read);
        return r;
    }

    /// <summary>Al arrancar: carga distritos e historial solo si sus tablas están vacías y hay archivos locales.</summary>
    public async Task ImportIfEmptyAsync(CancellationToken ct = default)
    {
        if (!options.ImportOnStartup) return;

        if (!await db.Districts.AnyAsync(ct) && File.Exists(options.Resolve(options.DistrictsGeoJsonPath)))
            await ImportDistrictsAsync(ct);
        else if (await db.HealthCenters.AnyAsync(h => h.Ubigeo == "", ct))
            await AssignHealthCenterDistrictsAsync(ct);   // establecimientos recién cargados sin distrito

        if (!await db.HistoricalEvents.AnyAsync(ct))
        {
            if (File.Exists(options.Resolve(options.SinpadZipPath)))
                await ImportHistoryAsync(download: false, ct);
            else
                logger.LogWarning("No está {Zip}. Usa POST /api/admin/importar/historial?descargar=true",
                    options.Resolve(options.SinpadZipPath));
        }
    }

    /// <summary>Corrige distrito y ubigeo de cada establecimiento de salud según su coordenada.</summary>
    private async Task AssignHealthCenterDistrictsAsync(CancellationToken ct)
    {
        var allDistricts = await db.Districts.AsNoTracking().ToListAsync(ct);
        var centers = await db.HealthCenters.ToListAsync(ct);
        foreach (var c in centers)
        {
            var d = allDistricts.FirstOrDefault(x =>
                x.MinLat <= c.Latitude && x.MaxLat >= c.Latitude && x.MinLon <= c.Longitude && x.MaxLon >= c.Longitude &&
                GeoUtils.IsPointInGeoJson(x.GeoJson, c.Latitude, c.Longitude));
            if (d is null) continue;
            c.Ubigeo = d.Ubigeo;
            c.District = d.Name;
        }
        await db.SaveChangesAsync(ct);
    }
}

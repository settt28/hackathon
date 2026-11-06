using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace ElNino.API.Controllers;

/// <summary>
/// Emergencias por peligros asociados a El Niño en todo el Perú en los últimos años (INDECI – SINPAD).
/// Ruta base: /api/estadisticas
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class EstadisticasController(IRepository<HistoricalEvent> events, IMemoryCache cache) : ControllerBase
{
    private static readonly HazardType[] ElNinoHazards =
        [HazardType.LluviaIntensa, HazardType.Huaico, HazardType.Inundacion, HazardType.Deslizamiento, HazardType.Marejada];

    /// <summary>
    /// Resumen nacional: totales, por año, por tipo de peligro y los departamentos más afectados.
    /// Ej: /api/estadisticas?anios=5 (desde el 1 de enero de hace 5 años hasta el último dato publicado).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int anios = 5, CancellationToken ct = default)
    {
        anios = Math.Clamp(anios, 1, 15);
        // ponytail: caché de 1 h; el historial solo cambia al reimportar (si se agrega importación frecuente, invalidar al importar)
        var result = await cache.GetOrCreateAsync($"estadisticas:{anios}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            var from = new DateTime(DateTime.UtcNow.Year - anios, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var list = await events.ListAsync(e => e.Date >= from && ElNinoHazards.Contains(e.Hazard), ct);
            return Build(list, from);
        });
        return Ok(result);
    }

    private static object Build(IReadOnlyList<HistoricalEvent> list, DateTime from)
    {
        static object Totals(IEnumerable<HistoricalEvent> g) => new
        {
            eventos = g.Count(),
            fallecidos = g.Sum(e => e.Deaths),
            afectados = g.Sum(e => e.Affected),
            viviendasDestruidas = g.Sum(e => e.HousesDestroyed),
        };

        var last = list.Count == 0 ? (DateTime?)null : list.Max(e => e.Date);
        return new
        {
            desde = from.Year,
            datosHasta = last?.ToString("yyyy-MM-dd"),
            fuente = "INDECI – SINPAD (Plataforma Nacional de Datos Abiertos)",
            nota = last is { Month: < 12 } l
                ? $"{l.Year} está incompleto: los datos publicados llegan hasta {l:dd/MM/yyyy}."
                : null,
            total = Totals(list),
            porAnio = list.GroupBy(e => e.Date.Year).OrderBy(g => g.Key)
                .Select(g => new { anio = g.Key, resumen = Totals(g) }),
            porPeligro = list.GroupBy(e => e.Hazard).OrderByDescending(g => g.Count())
                .Select(g => new { peligro = ZoneHistoryService.HazardName(g.Key), resumen = Totals(g) }),
            departamentos = list.GroupBy(e => e.Department).OrderByDescending(g => g.Count()).Take(10)
                .Select(g => new { departamento = g.Key, resumen = Totals(g) }),
        };
    }
}

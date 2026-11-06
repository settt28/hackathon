using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Paquete de datos para el modo offline. El frontend lo descarga cuando hay internet
/// y lo guarda en el navegador (IndexedDB) para seguir funcionando sin conexión.
/// Ruta base: /api/sync
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SyncController(
    IRepository<PreventionTip> tips,
    IRepository<AlarmKeyword> keywords,
    IRepository<HealthCenter> centers,
    IRepository<RiskZone> zones,
    IAlertRepository alerts,
    IRepository<Bulletin> bulletins,
    DistrictService districts,
    ZoneHistoryService history) : ControllerBase
{
    /// <summary>
    /// Ej: /api/sync?lat=-11.9369&amp;lon=-76.6966 → detecta el distrito y arma el paquete de esa zona.
    /// También acepta ?ubigeo=150118. Los establecimientos de salud se limitan a ?radioKm= (30 km por defecto).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? ubigeo, [FromQuery] double? lat, [FromQuery] double? lon,
        [FromQuery] double radioKm = 30, CancellationToken ct = default)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180) return BadRequest("Coordenadas inválidas.");
        radioKm = Math.Clamp(radioKm, 1, 100); // sin tope, un radio enorme devolvía todas las postas del país

        // Distrito: el ubigeo enviado manda; si no, se deduce del GPS
        DistrictLocation? ubicacion = null;
        if (string.IsNullOrWhiteSpace(ubigeo) && lat is double gLat && lon is double gLon)
        {
            ubicacion = await districts.LocateAsync(gLat, gLon, ct);
            ubigeo = ubicacion?.Ubigeo;
        }
        var distrito = string.IsNullOrWhiteSpace(ubigeo) ? null : await districts.GetByUbigeoAsync(ubigeo, ct);

        IEnumerable<HealthCenter> centros;
        if (lat is double la && lon is double lo)
        {
            // Primero un rectángulo en la base de datos (usa índices, no carga todo el país); luego la distancia exacta
            var dLat = radioKm / 111.0;
            var dLon = radioKm / (111.0 * Math.Max(0.2, Math.Cos(la * Math.PI / 180)));
            centros = (await centers.ListAsync(c =>
                    c.Latitude >= la - dLat && c.Latitude <= la + dLat && c.Longitude >= lo - dLon && c.Longitude <= lo + dLon, ct))
                .Where(c => GeoUtils.HaversineKm(la, lo, c.Latitude, c.Longitude) <= radioKm);
        }
        else if (!string.IsNullOrWhiteSpace(ubigeo))
            centros = await centers.ListAsync(c => c.Ubigeo == ubigeo, ct);
        else
            centros = [];

        return Ok(new
        {
            generadoEn = DateTime.UtcNow,
            ubicacion,
            distrito,                                   // incluye el límite GeoJSON para el mapa offline
            consejos = await tips.GetAllAsync(ct),
            palabrasAlarma = await keywords.GetAllAsync(ct),
            centrosSalud = centros.ToList(),
            zonas = string.IsNullOrWhiteSpace(ubigeo)
                ? (IReadOnlyList<RiskZone>)[]
                : await zones.ListAsync(z => z.Ubigeo == ubigeo, ct),
            alertas = await alerts.GetActiveAsync(ubigeo, null, ct),
            historial = string.IsNullOrWhiteSpace(ubigeo) ? null : await history.GetSummaryAsync(ubigeo, maxEvents: 50, ct: ct),
            // Último boletín de cada institución (ej. estado de El Niño según el ENFEN)
            boletines = (await bulletins.GetAllAsync(ct))
                .GroupBy(b => b.Institution)
                .Select(g => g.OrderByDescending(b => b.PublishedAt).First())
                .ToList(),
            telefonos = new { samu = "106", bomberos = "116", defensaCivil = "115", policia = "105" },
        });
    }
}

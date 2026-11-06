using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Información geográfica de las zonas: historial de eventos, zonas de riesgo/seguras
/// y "radar geométrico" (¿estoy dentro de una zona de peligro?).
/// Ruta base: /api/zonas
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ZonasController(ZoneHistoryService history, DistrictService districts, IRepository<RiskZone> zones) : ControllerBase
{
    /// <summary>
    /// Historial del distrito y patrón por tipo de peligro. Ej: /api/zonas/150118/historial?limite=20
    /// (limite = cuántos eventos recientes devolver; el patrón usa siempre todos).
    /// </summary>
    [HttpGet("{ubigeo}/historial")]
    public async Task<IActionResult> GetHistorial(string ubigeo, [FromQuery] int limite = 30, CancellationToken ct = default) =>
        Ok(await history.GetSummaryAsync(ubigeo, maxEvents: Math.Clamp(limite, 0, MaxEvents), ct: ct));

    // Tope de eventos por respuesta: el patrón siempre usa todo el historial, la lista es solo para mostrar
    private const int MaxEvents = 200;

    /// <summary>
    /// Historial de donde está la persona: ubica el GPS en su distrito y devuelve su historial.
    /// Ej: /api/zonas/historial?lat=-11.9369&amp;lon=-76.6966
    /// </summary>
    [HttpGet("historial")]
    public async Task<IActionResult> GetHistorialPorUbicacion([FromQuery] double lat, [FromQuery] double lon,
        [FromQuery] int limite = 30, CancellationToken ct = default)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180) return BadRequest("Coordenadas inválidas.");
        var location = await districts.LocateAsync(lat, lon, ct);
        if (location is null) return NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.");
        return Ok(new { ubicacion = location, historial = await history.GetSummaryAsync(location.Ubigeo, maxEvents: Math.Clamp(limite, 0, MaxEvents), ct: ct) });
    }

    /// <summary>Zonas de riesgo y zonas seguras del distrito (GeoJSON para pintar en el mapa).</summary>
    [HttpGet("{ubigeo}/mapa")]
    public async Task<IActionResult> GetZonas(string ubigeo, [FromQuery] ZoneType? tipo, CancellationToken ct) =>
        Ok(await zones.ListAsync(z => z.Ubigeo == ubigeo && (tipo == null || z.ZoneType == tipo), ct));

    /// <summary>
    /// Radar geométrico: devuelve las zonas que contienen el punto.
    /// Ej: /api/zonas/verificar?lat=-11.930&amp;lon=-76.696
    /// </summary>
    [HttpGet("verificar")]
    public async Task<IActionResult> Verificar([FromQuery] double lat, [FromQuery] double lon, CancellationToken ct)
    {
        var all = await zones.GetAllAsync(ct);
        var dentro = all.Where(z => GeoUtils.IsPointInGeoJson(z.GeoJson, lat, lon)).ToList();
        var riesgo = dentro.Where(z => z.ZoneType == ZoneType.Riesgo).ToList();

        return Ok(new
        {
            enZonaDeRiesgo = riesgo.Count > 0,
            mensaje = riesgo.Count > 0
                ? $"Estás en una zona de riesgo de {ZoneHistoryService.HazardName(riesgo[0].Hazard)}. Identifica tu ruta a la zona segura."
                : "No estás dentro de una zona de riesgo registrada.",
            zonas = dentro,
        });
    }
}

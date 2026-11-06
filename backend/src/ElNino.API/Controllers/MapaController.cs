using System.Text.Json.Nodes;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Mapa: todas las capas alrededor de la persona en una sola respuesta GeoJSON.
/// Ruta base: /api/mapa
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class MapaController(MapService map, RiskMapService riskMap) : ControllerBase
{
    /// <summary>
    /// Ej: /api/mapa?lat=-11.9369&amp;lon=-76.6966&amp;radioKm=5
    /// Devuelve un FeatureCollection; cada figura tiene "properties.capa":
    /// ubicacion | distrito | centro_salud | zona_riesgo | zona_segura.
    /// Además trae alertas vigentes, avisos del SENAMHI de la zona y "actualizarCadaSegundos"
    /// para que el frontend vuelva a pedirlo y el mapa se mantenga al día.
    /// Con ?clima=false no consulta al SENAMHI (útil sin internet o para respuestas más rápidas).
    /// </summary>
    [HttpGet]
    [Produces("application/geo+json", "application/json")]
    public async Task<IActionResult> Get([FromQuery] double lat, [FromQuery] double lon,
        [FromQuery] double radioKm = 5, [FromQuery] bool clima = true, CancellationToken ct = default)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180 || (lat == 0 && lon == 0))
            return BadRequest("Envía lat y lon válidos.");

        var geoJson = await map.BuildAsync(lat, lon, radioKm, clima, ct);
        if (geoJson["ubicacion"] is null)
            return NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.");
        return Content(geoJson.ToJsonString(), "application/geo+json");
    }

    /// <summary>
    /// Zonas de riesgo DINÁMICAS: los distritos alrededor de la persona coloreados por nivel de riesgo estimado
    /// (bajo / moderado / alto / muy alto), que cambia con los avisos del SENAMHI, la temporada y las alertas vigentes.
    /// Ej: /api/mapa/riesgo?lat=-11.9369&amp;lon=-76.6966&amp;radioKm=25
    /// Cada figura trae "properties.color" para pintarla directo, y "razones" para explicar el nivel.
    /// </summary>
    [HttpGet("riesgo")]
    [Produces("application/geo+json", "application/json")]
    public async Task<IActionResult> GetRiesgo([FromQuery] double lat, [FromQuery] double lon,
        [FromQuery] double radioKm = 25, [FromQuery] bool clima = true, CancellationToken ct = default)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180 || (lat == 0 && lon == 0))
            return BadRequest("Envía lat y lon válidos.");

        var geoJson = await riskMap.BuildAsync(lat, lon, radioKm, clima, ct);
        if (geoJson["tuDistrito"] is null && geoJson["features"] is JsonArray { Count: 0 })
            return NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.");
        return Content(geoJson.ToJsonString(), "application/geo+json");
    }
}

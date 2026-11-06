using System.Text.Json.Nodes;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElNino.API.Controllers;

/// <summary>
/// Mapa: todas las capas alrededor de la persona en una sola respuesta GeoJSON.
/// Ruta base: /api/mapa
/// </summary>
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting(RateLimits.Heavy)] // cada mapa recorre decenas de distritos con su historial y el modelo de riesgo
public class MapaController(MapService map, RiskMapService riskMap, RiskModelService riskModel) : ControllerBase
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
        if (!InputRules.IsValidCoordinate(lat, lon) || (lat == 0 && lon == 0))
            return BadRequest("Envía lat y lon válidos.");
        if (!InputRules.IsInPeru(lat, lon))
            return NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.");

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
        if (!InputRules.IsValidCoordinate(lat, lon) || (lat == 0 && lon == 0))
            return BadRequest("Envía lat y lon válidos.");
        if (!InputRules.IsInPeru(lat, lon))
            return NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.");
        if (!double.IsFinite(radioKm)) return BadRequest("Radio inválido.");

        // Hasta 50 km (antes 100): el radio más grande es la consulta más cara del backend; la app usa 20 km
        var geoJson = await riskMap.BuildAsync(lat, lon, Math.Clamp(radioKm, 1, 50), clima, ct);
        if (geoJson["tuDistrito"] is null && geoJson["features"] is JsonArray { Count: 0 })
            return NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.");
        return Content(geoJson.ToJsonString(), "application/geo+json");
    }

    /// <summary>
    /// Predicción del modelo XGBoost local para un distrito: probabilidad de emergencia en el mes, nivel y variables usadas.
    /// Ej: /api/mapa/prediccion?ubigeo=150118  (opcional &amp;anio=2027&amp;mes=2)
    /// </summary>
    [HttpGet("prediccion")]
    public async Task<IActionResult> GetPrediccion([FromQuery] string ubigeo, [FromQuery] int? anio, [FromQuery] int? mes, CancellationToken ct)
    {
        if (!riskModel.IsAvailable) return StatusCode(503, "El modelo de riesgo no está cargado.");
        if (!InputRules.IsUbigeo(ubigeo))
            return BadRequest("El ubigeo debe tener 6 dígitos.");
        if (mes is < 1 or > 12 || anio is < 2010 or > 2100) return BadRequest("Año o mes inválido.");

        var p = (await riskModel.PredictAsync([ubigeo], anio, mes, ct))[ubigeo];
        return Ok(new { prediccion = p, modelo = riskModel.Model!.Meta });
    }
}

using ElNino.Core.Entities;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElNino.API.Controllers;

/// <summary>
/// Pronóstico del tiempo y avisos meteorológicos del SENAMHI según la ubicación.
/// Ruta base: /api/clima
/// </summary>
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting(RateLimits.Heavy)]
public class ClimaController(WeatherService weather, DistrictService districts, ILogger<ClimaController> logger) : ControllerBase
{
    /// <summary>
    /// Pronóstico del tiempo para hoy (y los próximos días) donde está la persona.
    /// Ej: /api/clima/pronostico?lat=-5.19&amp;lon=-80.63  o  ?ubigeo=200101
    /// </summary>
    [HttpGet("pronostico")]
    public async Task<IActionResult> GetPronostico([FromQuery] double? lat, [FromQuery] double? lon,
        [FromQuery] string? ubigeo, CancellationToken ct)
    {
        if (!ValidInput(lat, lon, ubigeo)) return BadRequest("Coordenadas o ubigeo inválidos.");
        var district = await ResolveAsync(lat, lon, ubigeo, ct);
        if (district is null) return BadRequest("Envía lat y lon (o un ubigeo) de una ubicación en el Perú.");

        try
        {
            var forecast = await weather.GetLocalForecastAsync(district, lat, lon, ct);
            return forecast is null
                ? NotFound($"El SENAMHI no tiene pronóstico publicado para {district.Department}.")
                : Ok(forecast);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return SenamhiUnavailable(ex);
        }
    }

    /// <summary>
    /// Avisos meteorológicos vigentes y próximos del SENAMHI. Con ubicación, indica cuáles podrían afectar la zona.
    /// Ej: /api/clima/avisos?lat=-5.19&amp;lon=-80.63&amp;soloMiZona=true
    /// </summary>
    [HttpGet("avisos")]
    public async Task<IActionResult> GetAvisos([FromQuery] double? lat, [FromQuery] double? lon, [FromQuery] string? ubigeo,
        [FromQuery] bool soloMiZona = false, [FromQuery] bool incluirFinalizados = false, CancellationToken ct = default)
    {
        if (!ValidInput(lat, lon, ubigeo)) return BadRequest("Coordenadas o ubigeo inválidos.");
        var district = await ResolveAsync(lat, lon, ubigeo, ct);
        try
        {
            var list = await weather.GetWarningsAsync(district, incluirFinalizados, ct);
            if (soloMiZona && district is not null) list = list.Where(w => w.AffectsYourArea).ToList();
            return Ok(new
            {
                ubicacion = district is null ? null : new { district.Ubigeo, distrito = district.Name, district.Province, district.Department, regionNatural = district.NaturalRegion },
                fuente = "SENAMHI – Avisos meteorológicos",
                url = "https://www.senamhi.gob.pe/?p=aviso-meteorologico",
                avisos = list,
            });
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return SenamhiUnavailable(ex);
        }
    }

    /// <summary>El detalle técnico (URL, motivo) va al log; al cliente solo un mensaje claro.</summary>
    private ObjectResult SenamhiUnavailable(Exception ex)
    {
        logger.LogWarning(ex, "No se pudo consultar al SENAMHI");
        return Problem(title: "No se pudo consultar al SENAMHI", detail: "Intenta de nuevo en unos minutos.", statusCode: 502);
    }

    private static bool ValidInput(double? lat, double? lon, string? ubigeo) =>
        InputRules.IsOptionalUbigeo(ubigeo) &&
        (lat is null && lon is null || lat is double la && lon is double lo && InputRules.IsValidCoordinate(la, lo));

    private async Task<District?> ResolveAsync(double? lat, double? lon, string? ubigeo, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(ubigeo)) return await districts.GetByUbigeoAsync(ubigeo.Trim(), ct);
        if (lat is double la && lon is double lo && InputRules.IsInPeru(la, lo) && await districts.LocateAsync(la, lo, ct) is { } loc)
            return await districts.GetByUbigeoAsync(loc.Ubigeo, ct);
        return null;
    }
}

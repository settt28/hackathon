using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Convierte la ubicación GPS del usuario en su distrito (ubigeo INEI).
/// Ruta base: /api/ubicacion
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UbicacionController(DistrictService districts) : ControllerBase
{
    /// <summary>
    /// Ej: /api/ubicacion?lat=-11.9369&amp;lon=-76.6966 → Lurigancho (150118), Lima, Lima.
    /// "exact" = false significa que el punto cayó fuera de los polígonos (costa, límites) y se tomó el distrito más cercano.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] double lat, [FromQuery] double lon, CancellationToken ct)
    {
        if (lat is < -90 or > 90 || lon is < -180 or > 180)
            return BadRequest("Coordenadas inválidas.");

        var location = await districts.LocateAsync(lat, lon, ct);
        return location is null
            ? NotFound("La ubicación no corresponde a ningún distrito del Perú registrado.")
            : Ok(location);
    }

    /// <summary>Datos y límite (GeoJSON) de un distrito por su ubigeo.</summary>
    [HttpGet("distritos/{ubigeo}")]
    public async Task<IActionResult> GetDistrito(string ubigeo, CancellationToken ct) =>
        await districts.GetByUbigeoAsync(ubigeo, ct) is { } d ? Ok(d) : NotFound();
}

using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Endpoints del dominio de Salud.
/// Ruta base: /api/salud  (alertas y consejos vienen de DomainControllerBase)
/// </summary>
[Route("api/[controller]")]
public class SaludController(
    IAlertRepository alerts,
    IRepository<PreventionTip> tips,
    TipSearchService tipSearch,
    HealthCenterService healthCenters)
    : DomainControllerBase(AlertDomain.Salud, alerts, tips, tipSearch)
{
    /// <summary>
    /// Establecimientos de salud más cercanos a una ubicación.
    /// Ej: /api/salud/centros-cercanos?lat=-11.936&amp;lon=-76.697&amp;cantidad=5&amp;soloEmergencias=true
    /// </summary>
    [HttpGet("centros-cercanos")]
    public async Task<IActionResult> GetCentrosCercanos(
        [FromQuery] double lat, [FromQuery] double lon,
        [FromQuery] int cantidad = 5, [FromQuery] bool soloEmergencias = false, CancellationToken ct = default)
    {
        if (!InputRules.IsValidCoordinate(lat, lon))
            return BadRequest("Coordenadas inválidas.");
        // Fuera del Perú no hay postas: sin esto, cada consulta recorría el catálogo completo buscando la "más cercana"
        if (!InputRules.IsInPeru(lat, lon))
            return Ok(Array.Empty<object>());

        return Ok(await healthCenters.GetNearestAsync(lat, lon, cantidad, soloEmergencias, ct));
    }
}

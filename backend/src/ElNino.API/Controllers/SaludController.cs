using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Endpoints del dominio de Salud. Esqueleto inicial: agregar casos de uso aquí.
/// Ruta base: /api/salud
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SaludController(IAlertRepository alerts) : ControllerBase
{
    /// <summary>Lista las alertas del dominio de Salud.</summary>
    [HttpGet("alertas")]
    public async Task<IActionResult> GetAlertas(CancellationToken ct) =>
        Ok(await alerts.GetByDomainAsync(AlertDomain.Salud, ct));
}

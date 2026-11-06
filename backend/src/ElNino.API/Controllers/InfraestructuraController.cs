using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Endpoints del dominio de Infraestructura. Esqueleto inicial: agregar casos de uso aquí.
/// Ruta base: /api/infraestructura
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class InfraestructuraController(IAlertRepository alerts) : ControllerBase
{
    /// <summary>Lista las alertas del dominio de Infraestructura.</summary>
    [HttpGet("alertas")]
    public async Task<IActionResult> GetAlertas(CancellationToken ct) =>
        Ok(await alerts.GetByDomainAsync(AlertDomain.Infraestructura, ct));
}

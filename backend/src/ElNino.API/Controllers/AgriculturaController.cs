using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Endpoints del dominio de Agricultura. Esqueleto inicial: agregar casos de uso aquí.
/// Ruta base: /api/agricultura
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AgriculturaController(IAlertRepository alerts) : ControllerBase
{
    /// <summary>Lista las alertas del dominio de Agricultura.</summary>
    [HttpGet("alertas")]
    public async Task<IActionResult> GetAlertas(CancellationToken ct) =>
        Ok(await alerts.GetByDomainAsync(AlertDomain.Agricultura, ct));
}

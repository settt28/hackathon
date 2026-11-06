using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Base común para los controladores de Salud, Agricultura e Infraestructura:
/// todos exponen alertas y consejos de su propio dominio.
/// </summary>
[ApiController]
public abstract class DomainControllerBase(
    AlertDomain domain,
    IAlertRepository alerts,
    IRepository<PreventionTip> tips,
    TipSearchService tipSearch) : ControllerBase
{
    /// <summary>
    /// Alertas vigentes del dominio. Filtros opcionales:
    /// ?ubigeo= solo ese distrito, ?incluirVencidas=true suma las ya vencidas (historial).
    /// </summary>
    [HttpGet("alertas")]
    public async Task<IActionResult> GetAlertas(
        [FromQuery] string? ubigeo, [FromQuery] bool incluirVencidas = false, CancellationToken ct = default)
    {
        if (!incluirVencidas) return Ok(await alerts.GetActiveAsync(ubigeo, domain, ct));

        var todas = await alerts.GetByDomainAsync(domain, ct);
        return Ok(string.IsNullOrWhiteSpace(ubigeo) ? todas : todas.Where(a => a.Ubigeo == ubigeo));
    }

    /// <summary>
    /// Consejos preventivos del dominio. Filtros opcionales:
    /// ?q= texto libre, ?peligro=Huaico, ?fase=Antes|Durante|Despues.
    /// </summary>
    [HttpGet("consejos")]
    public async Task<IActionResult> GetConsejos(
        [FromQuery] string? q, [FromQuery] HazardType? peligro, [FromQuery] EventPhase? fase, CancellationToken ct)
    {
        IEnumerable<PreventionTip> result = string.IsNullOrWhiteSpace(q)
            ? await tips.ListAsync(t => t.Domain == domain, ct)
            : await tipSearch.SearchAsync(q, domain, 20, ct);

        if (peligro is not null) result = result.Where(t => t.Hazard == peligro);
        if (fase is not null) result = result.Where(t => t.Phase == fase);
        return Ok(result.ToList());
    }
}

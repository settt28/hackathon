using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Endpoints del dominio de Agricultura (incluye ganadería y pesca).
/// Ruta base: /api/agricultura  (alertas y consejos vienen de DomainControllerBase)
/// </summary>
[Route("api/[controller]")]
public class AgriculturaController(IAlertRepository alerts, IRepository<PreventionTip> tips, TipSearchService tipSearch)
    : DomainControllerBase(AlertDomain.Agricultura, alerts, tips, tipSearch);

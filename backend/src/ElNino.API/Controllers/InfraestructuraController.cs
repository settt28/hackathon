using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Endpoints del dominio de Infraestructura (vivienda, huaicos, inundaciones, evacuación).
/// Ruta base: /api/infraestructura  (alertas y consejos vienen de DomainControllerBase)
/// </summary>
[Route("api/[controller]")]
public class InfraestructuraController(IAlertRepository alerts, IRepository<PreventionTip> tips, TipSearchService tipSearch)
    : DomainControllerBase(AlertDomain.Infraestructura, alerts, tips, tipSearch);

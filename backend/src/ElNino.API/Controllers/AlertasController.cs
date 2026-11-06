using System.ComponentModel.DataAnnotations;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Alertas de todos los dominios. El POST lo usa el "operador" (COEN / municipalidad) para publicar alertas.
/// Ruta base: /api/alertas
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AlertasController(IAlertRepository alerts, IConfiguration config) : ControllerBase
{
    /// <summary>Alertas vigentes. Filtros opcionales: ?ubigeo=150118&amp;dominio=Salud</summary>
    [HttpGet]
    public async Task<IActionResult> GetVigentes([FromQuery] string? ubigeo, [FromQuery] AlertDomain? dominio, CancellationToken ct) =>
        Ok(await alerts.GetActiveAsync(ubigeo, dominio, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        await alerts.GetByIdAsync(id, ct) is { } a ? Ok(a) : NotFound();

    /// <summary>
    /// Publica una alerta. Requiere la cabecera X-Api-Key (valor en appsettings: Operador:ApiKey).
    /// Aquí se conectará el envío de SMS (Twilio) a los suscriptores del distrito.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearAlertaRequest req,
        [FromHeader(Name = "X-Api-Key")] string? apiKey, CancellationToken ct)
    {
        if (!ApiKeys.Matches(config, "Operador:ApiKey", apiKey))
            return Unauthorized("Falta la cabecera X-Api-Key o es incorrecta.");

        var alert = new Alert
        {
            Domain = req.Dominio,
            Level = req.Nivel,
            Hazard = req.Peligro,
            Title = req.Titulo.Trim(),
            Description = req.Descripcion.Trim(),
            Region = req.Region?.Trim() ?? string.Empty,
            Ubigeo = req.Ubigeo.Trim(),
            Source = string.IsNullOrWhiteSpace(req.Fuente) ? "Operador" : req.Fuente.Trim(),
            ExpiresAt = req.HorasVigencia is > 0 ? DateTime.UtcNow.AddHours(req.HorasVigencia.Value) : null,
        };

        await alerts.AddAsync(alert, ct);
        return CreatedAtAction(nameof(GetById), new { id = alert.Id }, alert);
    }
}

/// <summary>Datos para publicar una alerta.</summary>
public record CrearAlertaRequest(
    AlertDomain Dominio,
    RiskLevel Nivel,
    HazardType Peligro,
    [Required, StringLength(150)] string Titulo,
    [Required, StringLength(1000)] string Descripcion,
    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "El ubigeo debe tener 6 dígitos.")] string Ubigeo,
    string? Region = null,
    string? Fuente = null,
    int? HorasVigencia = 24);

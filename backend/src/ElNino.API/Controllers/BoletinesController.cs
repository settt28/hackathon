using System.ComponentModel.DataAnnotations;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Boletines y comunicados oficiales (ENFEN, SENAMHI, MINSA, INDECI…): información del momento.
/// Ruta base: /api/boletines
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BoletinesController(IRepository<Bulletin> bulletins, IConfiguration config) : ControllerBase
{
    /// <summary>Boletines más recientes. Filtro opcional: ?institucion=ENFEN&amp;limite=10</summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? institucion, [FromQuery] int limite = 10, CancellationToken ct = default)
    {
        if (institucion is { Length: > 30 }) return BadRequest("Institución inválida.");
        var list = string.IsNullOrWhiteSpace(institucion)
            ? await bulletins.GetAllAsync(ct)
            : await bulletins.ListAsync(b => b.Institution == institucion.Trim().ToUpper(), ct);
        return Ok(list.OrderByDescending(b => b.PublishedAt).Take(Math.Clamp(limite, 1, 100)));
    }

    /// <summary>El último boletín de cada institución (ej. el estado vigente de El Niño según el ENFEN).</summary>
    [HttpGet("ultimos")]
    public async Task<IActionResult> GetUltimos(CancellationToken ct) =>
        Ok((await bulletins.GetAllAsync(ct))
            .GroupBy(b => b.Institution)
            .Select(g => g.OrderByDescending(b => b.PublishedAt).First())
            .OrderBy(b => b.Institution));

    /// <summary>Registra un boletín nuevo. Requiere la cabecera X-Api-Key (Operador:ApiKey).</summary>
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearBoletinRequest req,
        [FromHeader(Name = "X-Api-Key")] string? apiKey, CancellationToken ct)
    {
        if (!ApiKeys.Matches(config, "Operador:ApiKey", apiKey))
            return Unauthorized("Falta la cabecera X-Api-Key o es incorrecta.");

        // Solo enlaces web: [Url] también acepta ftp://, y la app muestra este enlace a la persona
        if (!string.IsNullOrWhiteSpace(req.Url) &&
            !(Uri.TryCreate(req.Url.Trim(), UriKind.Absolute, out var link) && (link.Scheme == Uri.UriSchemeHttps || link.Scheme == Uri.UriSchemeHttp)))
            return BadRequest("El enlace debe empezar con https:// o http://.");
        if ((req.PuntosClave ?? []).Any(p => p.Length > 500) || (req.Regiones ?? []).Any(r => r.Length > 100))
            return BadRequest("Cada punto clave admite hasta 500 caracteres y cada región hasta 100.");

        var institution = req.Institucion.Trim().ToUpper();
        var number = req.Numero.Trim();
        if ((await bulletins.ListAsync(b => b.Institution == institution && b.Number == number, ct)).Count > 0)
            return Conflict($"Ya existe el boletín {institution} {number}.");

        var bulletin = new Bulletin
        {
            Institution = institution,
            Number = number,
            Title = req.Titulo.Trim(),
            PublishedAt = DateTime.SpecifyKind(req.Fecha.Date, DateTimeKind.Utc),
            AlertStatus = req.EstadoAlerta?.Trim() ?? string.Empty,
            Summary = req.Resumen.Trim(),
            KeyPoints = req.PuntosClave ?? [],
            Regions = req.Regiones ?? [],
            Url = req.Url?.Trim() ?? string.Empty,
            NextExpectedAt = req.ProximoBoletin is { } next ? DateTime.SpecifyKind(next.Date, DateTimeKind.Utc) : null,
        };
        await bulletins.AddAsync(bulletin, ct);
        return Created($"/api/boletines?institucion={institution}", bulletin);
    }
}

/// <summary>Datos para registrar un boletín oficial.</summary>
public record CrearBoletinRequest(
    [Required, StringLength(30)] string Institucion,
    [Required, StringLength(40)] string Numero,
    [Required, StringLength(200)] string Titulo,
    DateTime Fecha,
    [Required, StringLength(2000)] string Resumen,
    [StringLength(100)] string? EstadoAlerta = null,
    [MaxLength(20)] List<string>? PuntosClave = null,
    [MaxLength(30)] List<string>? Regiones = null,
    [Url, StringLength(500)] string? Url = null,
    DateTime? ProximoBoletin = null);

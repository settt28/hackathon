using System.Text.Json;
using System.Text.Json.Nodes;
using ElNino.Core.Models;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElNino.API.Controllers;

/// <summary>
/// Canal SMS (redes 2G, teléfonos sin internet). El gateway GSM (ej. Yeastar TG400) reenvía cada SMS
/// recibido a este endpoint y envía de vuelta el texto de la respuesta: un solo SMS de 160 caracteres.
/// Ruta base: /api/sms
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SmsController(PatyService paty, IConfiguration config) : ControllerBase
{
    /// <summary>
    /// SMS entrante. Acepta JSON o formulario con el texto en "text"/"mensaje"/"message" y el remitente en "from"/"numero".
    /// Clave en la cabecera X-Api-Key o en ?key= (muchos gateways no permiten cabeceras). Responde text/plain.
    /// </summary>
    [EnableRateLimiting(RateLimits.Sms)]
    [HttpPost("entrante")]
    public async Task<IActionResult> Entrante([FromQuery] string? key, CancellationToken ct)
    {
        if (!ApiKeys.Matches(config, "Sms:ApiKey", Request.Headers["X-Api-Key"].FirstOrDefault() ?? key))
            return Unauthorized("Falta la clave del gateway (X-Api-Key o ?key=) o es incorrecta.");

        string? text;
        if (Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(ct);
            text = new[] { "text", "mensaje", "message" }.Select(k => form[k].FirstOrDefault()).FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        }
        else
        {
            // JSON mal formado, o con el texto como número/objeto: 400, nunca un error 500
            JsonObject? json;
            try { json = await Request.ReadFromJsonAsync<JsonObject>(ct); }
            catch (Exception ex) when (ex is JsonException or InvalidOperationException) { return BadRequest("El cuerpo debe ser JSON o un formulario."); }
            text = new[] { "text", "mensaje", "message" }
                .Select(k => json?[k] is JsonValue v && v.TryGetValue<string>(out var s) ? s : null)
                .FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
        }
        if (string.IsNullOrWhiteSpace(text))
            return BadRequest("El SMS no trae texto.");

        // ponytail: sin ubicación por SMS; si se necesita la zona, reconocer el nombre del distrito en el texto.
        var reply = await paty.ChatAsync(new PatyRequest(text.Length > InputRules.MaxMessage ? text[..InputRules.MaxMessage] : text), ct);
        return Content(ChannelText.Sms(reply), "text/plain; charset=utf-8");
    }
}

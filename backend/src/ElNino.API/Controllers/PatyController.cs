using ElNino.Core.Models;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Chatbot Paty. Ruta base: /api/paty
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PatyController(PatyService paty, TriageService triage) : ControllerBase
{
    /// <summary>
    /// Envía un mensaje a Paty. Devuelve la respuesta, el triaje (con número a llamar si es grave),
    /// los consejos usados, advertencias del historial de la zona, postas cercanas y botones de acción.
    /// </summary>
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] PatyRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest("El mensaje no puede estar vacío.");
        if (req.Message.Length > 1000)
            return BadRequest("El mensaje es demasiado largo (máximo 1000 caracteres).");

        return Ok(await paty.ChatAsync(req, ct));
    }

    /// <summary>Solo el triaje (útil para probar la lista de palabras de alarma).</summary>
    [HttpPost("triaje")]
    public async Task<IActionResult> Triaje([FromBody] TriajeRequest req, CancellationToken ct) =>
        Ok(await triage.EvaluateAsync(req.Message ?? string.Empty, ct));
}

public record TriajeRequest(string? Message);

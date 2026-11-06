using ElNino.Core.Interfaces;
using ElNino.Core.Models;
using ElNino.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ElNino.API.Controllers;

/// <summary>
/// Chatbot Paty. Ruta base: /api/paty
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PatyController(
    PatyService paty,
    TriageService triage,
    IChatModel chatModel,
    ISpeechToText speechToText,
    ITextToSpeech textToSpeech,
    RiskModelService riskModel) : ControllerBase
{
    /// <summary>
    /// Envía un mensaje a Paty. Devuelve la respuesta, el triaje (con número a llamar si es grave),
    /// los consejos usados, advertencias del historial de la zona, postas cercanas y botones de acción.
    /// </summary>
    [EnableRateLimiting(RateLimits.Ai)]
    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] PatyRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Message))
            return BadRequest("El mensaje no puede estar vacío.");
        if (req.Message.Length > 1000)
            return BadRequest("El mensaje es demasiado largo (máximo 1000 caracteres).");

        return Ok(await paty.ChatAsync(req, ct));
    }

    /// <summary>
    /// Mensaje de voz: el audio (webm/ogg/mp3/wav, máx. 10 MB) se transcribe con Whisper y se responde como en /chat.
    /// 503 si el dictado no está configurado (sección "Ai:Stt").
    /// </summary>
    [EnableRateLimiting(RateLimits.Ai)]
    [HttpPost("voz")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Voz(IFormFile audio, [FromForm] double? lat, [FromForm] double? lon, CancellationToken ct)
    {
        if (!speechToText.IsAvailable)
            return StatusCode(503, "El dictado por voz no está configurado en el servidor.");
        if (audio is null || audio.Length == 0)
            return BadRequest("No se recibió audio.");

        await using var stream = audio.OpenReadStream();
        var text = await speechToText.TranscribeAsync(stream, string.IsNullOrWhiteSpace(audio.FileName) ? "audio.webm" : audio.FileName, ct);
        if (string.IsNullOrWhiteSpace(text))
            return UnprocessableEntity("No se entendió el audio. Intenta de nuevo, más cerca del micrófono.");

        var message = text.Length > 1000 ? text[..1000] : text;
        return Ok(new { transcripcion = message, respuesta = await paty.ChatAsync(new PatyRequest(message, Latitude: lat, Longitude: lon), ct) });
    }

    /// <summary>Lee un texto en voz alta (MP3, Fish Audio). 503 si no está configurado: el navegador usa su propia voz.</summary>
    [EnableRateLimiting(RateLimits.Ai)]
    [HttpPost("tts")]
    public async Task<IActionResult> Tts([FromBody] TtsRequest req, CancellationToken ct)
    {
        if (!textToSpeech.IsAvailable)
            return StatusCode(503, "La voz del servidor no está configurada.");
        var text = ChannelText.Speakable(req.Texto ?? string.Empty);
        if (text.Length == 0) return BadRequest("No hay texto para leer.");

        var audio = await textToSpeech.SynthesizeAsync(text, ct);
        return audio is null ? StatusCode(502, "El servicio de voz no respondió.") : File(audio, "audio/mpeg");
    }

    /// <summary>Qué piezas de IA están activas, para que el frontend muestre solo lo que funciona.</summary>
    [HttpGet("capacidades")]
    public IActionResult Capacidades() => Ok(new
    {
        ia = chatModel.Name,
        dictado = speechToText.IsAvailable,
        vozServidor = textToSpeech.IsAvailable,
        modeloRiesgo = riskModel.Model?.Meta,
    });

    /// <summary>Solo el triaje (útil para probar la lista de palabras de alarma).</summary>
    [HttpPost("triaje")]
    public async Task<IActionResult> Triaje([FromBody] TriajeRequest req, CancellationToken ct) =>
        Ok(await triage.EvaluateAsync(req.Message ?? string.Empty, ct));
}

public record TriajeRequest(string? Message);

public record TtsRequest(string? Texto);

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
        if (req.Message.Length > InputRules.MaxMessage)
            return BadRequest($"El mensaje es demasiado largo (máximo {InputRules.MaxMessage} caracteres).");
        if (!InputRules.IsOptionalUbigeo(req.Ubigeo))
            return BadRequest("El ubigeo debe tener 6 dígitos.");
        if (!TryLocation(req.Latitude, req.Longitude, out var lat, out var lon))
            return BadRequest("Coordenadas inválidas.");

        return Ok(await paty.ChatAsync(req with { Latitude = lat, Longitude = lon }, ct));
    }

    // Formatos que acepta Whisper. El nombre que se le reenvía lo arma el servidor: el del cliente nunca sale de aquí.
    private static readonly Dictionary<string, string> AudioTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".webm"] = "audio/webm", [".ogg"] = "audio/ogg", [".mp4"] = "audio/mp4", [".m4a"] = "audio/mp4",
        [".mp3"] = "audio/mpeg", [".mpeg"] = "audio/mpeg", [".wav"] = "audio/wav", [".flac"] = "audio/flac",
    };

    /// <summary>
    /// Ubicación opcional: las dos coordenadas o ninguna, y numéricamente válidas (si no, false → 400).
    /// Fuera del Perú se descartan (lat/lon = null): Paty responde igual, sin datos de la zona,
    /// y no se recorre todo el catálogo de postas buscando la "más cercana" a otro país.
    /// </summary>
    private static bool TryLocation(double? latIn, double? lonIn, out double? lat, out double? lon)
    {
        lat = lon = null;
        if (latIn is null && lonIn is null) return true;
        if (latIn is not double la || lonIn is not double lo || !InputRules.IsValidCoordinate(la, lo)) return false;
        if (InputRules.IsInPeru(la, lo)) (lat, lon) = (la, lo);
        return true;
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
        if (!TryLocation(lat, lon, out var gLat, out var gLon))
            return BadRequest("Coordenadas inválidas.");

        // Formato por la extensión o, si no tiene, por el tipo declarado. Cualquier otra cosa se rechaza.
        var ext = Path.GetExtension(audio.FileName ?? string.Empty);
        if (!AudioTypes.ContainsKey(ext))
            ext = AudioTypes.FirstOrDefault(kv => string.Equals(kv.Value, audio.ContentType?.Split(';')[0].Trim(), StringComparison.OrdinalIgnoreCase)).Key ?? string.Empty;
        if (ext.Length == 0)
            return StatusCode(StatusCodes.Status415UnsupportedMediaType, "Formato de audio no admitido (usa webm, ogg, mp4, m4a, mp3, wav o flac).");

        await using var stream = audio.OpenReadStream();
        var text = await speechToText.TranscribeAsync(stream, "audio" + ext.ToLowerInvariant(), ct);
        if (string.IsNullOrWhiteSpace(text))
            return UnprocessableEntity("No se entendió el audio. Intenta de nuevo, más cerca del micrófono.");

        var message = text.Length > InputRules.MaxMessage ? text[..InputRules.MaxMessage] : text;
        return Ok(new { transcripcion = message, respuesta = await paty.ChatAsync(new PatyRequest(message, Latitude: gLat, Longitude: gLon), ct) });
    }

    /// <summary>Lee un texto en voz alta (MP3, Fish Audio). 503 si no está configurado: el navegador usa su propia voz.</summary>
    [EnableRateLimiting(RateLimits.Tts)]
    [HttpPost("tts")]
    public async Task<IActionResult> Tts([FromBody] TtsRequest req, CancellationToken ct)
    {
        if (!textToSpeech.IsAvailable)
            return StatusCode(503, "La voz del servidor no está configurada.");
        // Fish Audio cobra por carácter: sin tope, una sola petición podía gastar la cuota leyendo ~1 MB de texto.
        // El frontend pide la voz por frases (~180 caracteres), así que el tope no afecta el uso normal.
        if ((req.Texto?.Length ?? 0) > InputRules.MaxMessage)
            return BadRequest($"El texto es demasiado largo (máximo {InputRules.MaxMessage} caracteres).");
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
        (req.Message?.Length ?? 0) > InputRules.MaxMessage
            ? BadRequest($"El mensaje es demasiado largo (máximo {InputRules.MaxMessage} caracteres).")
            : Ok(await triage.EvaluateAsync(req.Message ?? string.Empty, ct));
}

public record TriajeRequest(string? Message);

public record TtsRequest(string? Texto);

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using ElNino.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace ElNino.Infrastructure.Ai;

/// <summary>
/// Chat con cualquier servidor compatible con la API de OpenAI: Groq (nube) u Ollama/llama.cpp (local, sin internet).
/// Si falla devuelve null y Paty sigue con su respuesta por plantilla: la IA nunca tumba el chat.
/// </summary>
public sealed class OpenAiCompatibleChatModel(AiEndpointOptions options, ILogger<OpenAiCompatibleChatModel> logger) : IChatModel
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(25) };

    public string? Name => $"{options.Model} ({(AiEndpointOptions.IsLocal(options.BaseUrl) ? "local" : new Uri(options.BaseUrl).Host)})";

    public async Task<string?> GenerateAsync(string systemPrompt, string userMessage, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{options.BaseUrl.TrimEnd('/')}/chat/completions")
        {
            Content = Json(new
            {
                model = options.Model,
                temperature = 0.3, // respuestas sobrias: instrucciones, no creatividad
                max_tokens = 500,
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userMessage },
                },
            }),
        };
        if (!string.IsNullOrWhiteSpace(options.ApiKey))
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        using var res = await Http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("IA ({Model}) respondió {Status}: {Body}", options.Model, (int)res.StatusCode, await Snippet(res, ct));
            return null;
        }
        var json = await res.Content.ReadFromJsonAsync<JsonNode>(ct);
        return json?["choices"]?[0]?["message"]?["content"]?.GetValue<string>();
    }

    /// <summary>JSON con Content-Length (no chunked): algunos servidores locales no leen cuerpos fragmentados.</summary>
    internal static StringContent Json(object body) =>
        new(System.Text.Json.JsonSerializer.Serialize(body), System.Text.Encoding.UTF8, "application/json");

    internal static async Task<string> Snippet(HttpResponseMessage res, CancellationToken ct)
    {
        var body = await res.Content.ReadAsStringAsync(ct);
        return body.Length > 300 ? body[..300] : body;
    }
}

/// <summary>Voz a texto con Whisper por la API compatible con OpenAI (Groq, o faster-whisper-server/speaches en local).</summary>
public sealed class WhisperSpeechToText(AiEndpointOptions options, ILogger<WhisperSpeechToText> logger) : ISpeechToText
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(40) };

    // Vocabulario de la zona para que Whisper no confunda términos locales
    private const string Vocabulary =
        "Perú, Fenómeno El Niño, huaico, huayco, quebrada, lluvias, inundación, desborde, deslizamiento, derrumbe, " +
        "dengue, zancudo, diarrea, posta, centro de salud, chacra, cultivos, Defensa Civil, Bomberos, SAMU, SENAMHI, INDECI, ENFEN.";

    public bool IsAvailable => true;

    public async Task<string?> TranscribeAsync(Stream audio, string fileName, CancellationToken ct = default)
    {
        // En memoria para enviar con Content-Length (el audio está limitado a 10 MB en el controlador)
        using var buffer = new MemoryStream();
        await audio.CopyToAsync(buffer, ct);
        using var form = new MultipartFormDataContent
        {
            { new ByteArrayContent(buffer.ToArray()), "file", fileName },
            { new StringContent(options.Model), "model" },
            { new StringContent("es"), "language" },
            { new StringContent("text"), "response_format" },
            { new StringContent(Vocabulary), "prompt" },
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{options.BaseUrl.TrimEnd('/')}/audio/transcriptions") { Content = form };
        if (!string.IsNullOrWhiteSpace(options.ApiKey))
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        using var res = await Http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("Whisper respondió {Status}: {Body}", (int)res.StatusCode, await OpenAiCompatibleChatModel.Snippet(res, ct));
            return null;
        }
        var text = (await res.Content.ReadAsStringAsync(ct)).Trim();
        return text.Length == 0 ? null : text;
    }
}

/// <summary>Texto a voz con Fish Audio (POST /v1/tts). Devuelve MP3.</summary>
public sealed class FishAudioTextToSpeech(FishAudioOptions options, ILogger<FishAudioTextToSpeech> logger) : ITextToSpeech
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(30) };

    public bool IsAvailable => true;

    public async Task<byte[]?> SynthesizeAsync(string text, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{options.BaseUrl.TrimEnd('/')}/v1/tts")
        {
            Content = OpenAiCompatibleChatModel.Json(new { text, reference_id = options.VoiceId, format = "mp3" }),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        using var res = await Http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            logger.LogWarning("Fish Audio respondió {Status}: {Body}", (int)res.StatusCode, await OpenAiCompatibleChatModel.Snippet(res, ct));
            return null;
        }
        return await res.Content.ReadAsByteArrayAsync(ct);
    }
}

using System.Net;

namespace ElNino.Infrastructure.Ai;

/// <summary>
/// Sección "Ai" de appsettings. Las claves NUNCA van en el repo: se pasan por variables de entorno
/// (Ai__Chat__ApiKey, Ai__Stt__ApiKey, Ai__Tts__ApiKey) o con `dotnet user-secrets`.
///
/// Nube (con internet):  BaseUrl = https://api.groq.com/openai/v1  + ApiKey de console.groq.com
/// Local (sin internet): BaseUrl = http://localhost:11434/v1 (Ollama, `ollama pull llama3.1:8b`), sin ApiKey
/// </summary>
public class AiOptions
{
    public AiEndpointOptions Chat { get; set; } = new();
    public AiEndpointOptions Stt { get; set; } = new();
    public FishAudioOptions Tts { get; set; } = new();
}

/// <summary>Un servicio con API compatible con OpenAI (Groq, Ollama, servidor Whisper local…).</summary>
public class AiEndpointOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Configurado si hay URL y modelo, y además clave o un servidor en la red local (que no la necesita).</summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(BaseUrl) && !string.IsNullOrWhiteSpace(Model) &&
        (!string.IsNullOrWhiteSpace(ApiKey) || IsLocal(BaseUrl));

    public static bool IsLocal(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u)) return false;
        if (u.IsLoopback) return true;
        if (!IPAddress.TryParse(u.Host, out var ip)) return u.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase);
        var b = ip.GetAddressBytes();
        return b.Length == 4 && (b[0] == 10 || (b[0] == 192 && b[1] == 168) || (b[0] == 172 && b[1] is >= 16 and <= 31));
    }
}

/// <summary>Fish Audio (fish.audio): voz natural en la nube. VoiceId = id del modelo de voz de referencia.</summary>
public class FishAudioOptions
{
    public string BaseUrl { get; set; } = "https://api.fish.audio";
    public string ApiKey { get; set; } = string.Empty;
    public string VoiceId { get; set; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(VoiceId);
}

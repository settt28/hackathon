namespace ElNino.Core.Interfaces;

/// <summary>
/// Punto de conexión para un modelo de lenguaje (Gemma vía Ollama, Gemini, etc.).
/// Si devuelve null, Paty responde con la plantilla basada en los consejos (modo sin IA),
/// así el chat nunca se queda sin respuesta.
/// </summary>
public interface IChatModel
{
    Task<string?> GenerateAsync(string systemPrompt, string userMessage, CancellationToken ct = default);
}

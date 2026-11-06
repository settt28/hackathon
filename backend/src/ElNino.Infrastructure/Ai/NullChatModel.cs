using ElNino.Core.Interfaces;

namespace ElNino.Infrastructure.Ai;

/// <summary>
/// Implementación por defecto: no hay modelo de IA conectado, Paty responde con plantillas.
/// Para conectar una IA, crear otra clase que implemente IChatModel (ej. OllamaChatModel)
/// y registrarla en DependencyInjection en lugar de esta.
/// </summary>
public class NullChatModel : IChatModel
{
    public Task<string?> GenerateAsync(string systemPrompt, string userMessage, CancellationToken ct = default) =>
        Task.FromResult<string?>(null);
}

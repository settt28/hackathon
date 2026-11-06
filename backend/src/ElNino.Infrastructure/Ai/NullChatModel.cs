using ElNino.Core.Interfaces;

namespace ElNino.Infrastructure.Ai;

/// <summary>Sin modelo de IA configurado: Paty responde con plantillas (sección "Ai:Chat" de appsettings).</summary>
public class NullChatModel : IChatModel
{
    public Task<string?> GenerateAsync(string systemPrompt, string userMessage, CancellationToken ct = default) =>
        Task.FromResult<string?>(null);
}

/// <summary>Sin dictado configurado (sección "Ai:Stt").</summary>
public class NullSpeechToText : ISpeechToText
{
    public bool IsAvailable => false;
    public Task<string?> TranscribeAsync(Stream audio, string fileName, CancellationToken ct = default) => Task.FromResult<string?>(null);
}

/// <summary>Sin voz en el servidor (sección "Ai:Tts"): el frontend usa la voz del navegador.</summary>
public class NullTextToSpeech : ITextToSpeech
{
    public bool IsAvailable => false;
    public Task<byte[]?> SynthesizeAsync(string text, CancellationToken ct = default) => Task.FromResult<byte[]?>(null);
}

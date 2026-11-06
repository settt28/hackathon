namespace ElNino.Core.Interfaces;

/// <summary>Voz a texto (Whisper vía Groq o un servidor Whisper local con la misma API).</summary>
public interface ISpeechToText
{
    bool IsAvailable { get; }
    Task<string?> TranscribeAsync(Stream audio, string fileName, CancellationToken ct = default);
}

/// <summary>Texto a voz en el servidor (Fish Audio). Sin él, el navegador lee con su propia voz, que funciona sin internet.</summary>
public interface ITextToSpeech
{
    bool IsAvailable { get; }

    /// <summary>Audio MP3, o null si falló.</summary>
    Task<byte[]?> SynthesizeAsync(string text, CancellationToken ct = default);
}

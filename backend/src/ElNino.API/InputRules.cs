namespace ElNino.API;

/// <summary>
/// Validación común de lo que llega de afuera (coordenadas, ubigeos, textos).
/// Rechazar temprano evita errores 500 y consultas caras con datos sin sentido (NaN, puntos fuera del Perú…).
/// </summary>
public static class InputRules
{
    /// <summary>Largo máximo de un mensaje de texto (chat, SMS, triaje, voz a leer).</summary>
    public const int MaxMessage = 1000;

    /// <summary>Largo máximo de una búsqueda libre (consejos).</summary>
    public const int MaxQuery = 200;

    /// <summary>Coordenadas numéricamente válidas (sin NaN/Infinito y dentro del rango del planeta).</summary>
    public static bool IsValidCoordinate(double lat, double lon) =>
        double.IsFinite(lat) && double.IsFinite(lon) && lat is >= -90 and <= 90 && lon is >= -180 and <= 180;

    /// <summary>
    /// Dentro del Perú (rectángulo con ~1° de margen). Fuera de aquí no hay distritos ni postas: las búsquedas
    /// caerían en su "último recurso" y recorrerían todo el catálogo en cada petición.
    /// </summary>
    public static bool IsInPeru(double lat, double lon) =>
        IsValidCoordinate(lat, lon) && lat is >= -19.5 and <= 1.0 && lon is >= -82.5 and <= -67.5;

    /// <summary>Ubigeo INEI: exactamente 6 dígitos.</summary>
    public static bool IsUbigeo(string? value) => value is { Length: 6 } && value.All(char.IsAsciiDigit);

    /// <summary>Ubigeo opcional: vacío es válido (sin filtro).</summary>
    public static bool IsOptionalUbigeo(string? value) => string.IsNullOrWhiteSpace(value) || IsUbigeo(value.Trim());
}

using System.Security.Cryptography;
using System.Text;

namespace ElNino.API;

/// <summary>Comprobación única de las claves de operador y del gateway SMS.</summary>
public static class ApiKeys
{
    /// <summary>Largo mínimo: una clave corta se adivina por fuerza bruta aunque haya límite de peticiones.</summary>
    public const int MinLength = 24;

    // Claves publicadas en el repositorio (las de demo de antes y los ejemplos de appsettings.Local.example.json):
    // quedan inutilizables para siempre, aunque alguien copie la plantilla sin cambiarlas
    private static readonly HashSet<string> Compromised =
    [
        "demo-operador-2026", "demo-sms-2026",
        "clave_larga_y_aleatoria_de_al_menos_24_caracteres", "otra_clave_larga_y_aleatoria_para_el_gateway_sms",
    ];

    /// <summary>
    /// True si la clave configurada en <paramref name="configKey"/> es segura y coincide con la recibida.
    /// La comparación es en tiempo constante: no deja adivinar la clave carácter a carácter midiendo tiempos.
    /// Sin clave configurada, o con una débil o publicada, siempre false: el endpoint queda cerrado, nunca abierto.
    /// </summary>
    public static bool Matches(IConfiguration config, string configKey, string? given)
    {
        var expected = config[configKey];
        if (!IsStrong(expected) || string.IsNullOrEmpty(given)) return false;
        return CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(expected!)),   // hash: mismo largo aunque las claves difieran
            SHA256.HashData(Encoding.UTF8.GetBytes(given)));
    }

    public static bool IsStrong(string? key) =>
        !string.IsNullOrWhiteSpace(key) && key.Length >= MinLength && !Compromised.Contains(key);

    /// <summary>Avisa al arrancar si una clave falta o no sirve (el endpoint queda cerrado hasta corregirla).</summary>
    public static void WarnIfWeak(IConfiguration config, ILogger logger, params string[] configKeys)
    {
        foreach (var key in configKeys)
            if (!IsStrong(config[key]))
                logger.LogWarning("{Key} falta, es corta (< {Min} caracteres) o fue publicada: los endpoints que la usan quedan cerrados. " +
                                  "Configúrala en appsettings.Local.json o en la variable de entorno {Env}.",
                    key, MinLength, key.Replace(":", "__"));
    }
}

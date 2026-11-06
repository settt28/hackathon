using System.Security.Cryptography;
using System.Text;

namespace ElNino.API;

/// <summary>Comprobación única de las claves de operador y del gateway SMS.</summary>
public static class ApiKeys
{
    /// <summary>
    /// True si la clave configurada en <paramref name="configKey"/> existe y coincide con la recibida.
    /// La comparación es en tiempo constante: no deja adivinar la clave carácter a carácter midiendo tiempos.
    /// Sin clave configurada, siempre false (un endpoint protegido nunca queda abierto por olvido).
    /// </summary>
    public static bool Matches(IConfiguration config, string configKey, string? given)
    {
        var expected = config[configKey];
        if (string.IsNullOrEmpty(expected) || string.IsNullOrEmpty(given)) return false;
        return CryptographicOperations.FixedTimeEquals(
            SHA256.HashData(Encoding.UTF8.GetBytes(expected)),   // hash: mismo largo aunque las claves difieran
            SHA256.HashData(Encoding.UTF8.GetBytes(given)));
    }
}

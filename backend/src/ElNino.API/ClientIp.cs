using System.Net;

namespace ElNino.API;

/// <summary>
/// IP real de quien hace la petición, para el límite de peticiones.
///
/// Detrás de un túnel o proxy inverso (Cloudflare Tunnel, nginx…) todas las conexiones llegan desde el proxy: sin esto,
/// todo internet compartiría un solo cupo y una sola persona podría dejar sin servicio a las demás.
/// Las cabeceras CF-Connecting-IP / X-Forwarded-For solo se creen si la conexión viene de un proxy de confianza:
/// la propia máquina (loopback, donde corre cloudflared) o las IP de "Proxies:Trusted". Si no, cualquiera podría
/// inventarse una IP por petición y saltarse el límite.
/// </summary>
public static class ClientIp
{
    public static string Resolve(HttpContext ctx, IReadOnlySet<IPAddress> trustedProxies)
    {
        var remote = ctx.Connection.RemoteIpAddress;
        if (remote is null) return "desconocida";
        if (remote.IsIPv4MappedToIPv6) remote = remote.MapToIPv4();

        if (!IPAddress.IsLoopback(remote) && !trustedProxies.Contains(remote))
            return remote.ToString();

        // Cloudflare pone la IP del visitante en CF-Connecting-IP
        if (TryParse(ctx.Request.Headers["CF-Connecting-IP"].FirstOrDefault(), out var cf)) return cf.ToString();

        // Otros proxies: X-Forwarded-For = "cliente, proxy1, proxy2". El último lo agregó nuestro proxy de confianza.
        var forwarded = ctx.Request.Headers["X-Forwarded-For"].ToString()
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (forwarded.Length > 0 && TryParse(forwarded[^1], out var xff)) return xff.ToString();

        return remote.ToString();
    }

    public static IReadOnlySet<IPAddress> ParseTrusted(IEnumerable<string>? values) =>
        (values ?? []).Select(v => IPAddress.TryParse(v.Trim(), out var ip) ? ip : null).OfType<IPAddress>().ToHashSet();

    private static bool TryParse(string? value, out IPAddress ip) => IPAddress.TryParse(value?.Trim(), out ip!);
}

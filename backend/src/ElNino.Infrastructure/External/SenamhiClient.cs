using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using ElNino.Core.Interfaces;
using ElNino.Core.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace ElNino.Infrastructure.External;

/// <summary>
/// Lee la información pública de la web del SENAMHI (no tiene API):
///  - Pronóstico por ciudad: https://www.senamhi.gob.pe/main.php?dp={departamento}&amp;p=pronostico-meteorologico
///  - Avisos meteorológicos: https://www.senamhi.gob.pe/?p=aviso-meteorologico
/// Los resultados se guardan en caché para no consultar la web en cada pedido.
/// Si la web cambia de formato, este es el único archivo que hay que ajustar.
/// </summary>
public partial class SenamhiClient(IMemoryCache cache, ILogger<SenamhiClient> logger) : ISenamhiClient
{
    public const string BaseUrl = "https://www.senamhi.gob.pe/";
    private static readonly TimeSpan ForecastTtl = TimeSpan.FromHours(1);
    private static readonly TimeSpan WarningsTtl = TimeSpan.FromMinutes(20);
    private static readonly HttpClient Http = CreateHttp();

    private static readonly Dictionary<string, int> Months = new()
    {
        ["enero"] = 1, ["febrero"] = 2, ["marzo"] = 3, ["abril"] = 4, ["mayo"] = 5, ["junio"] = 6, ["julio"] = 7,
        ["agosto"] = 8, ["setiembre"] = 9, ["septiembre"] = 9, ["octubre"] = 10, ["noviembre"] = 11, ["diciembre"] = 12,
    };

    public async Task<IReadOnlyList<CityForecast>> GetForecastAsync(string departmentSlug, CancellationToken ct = default)
    {
        var slug = departmentSlug.Trim().ToLowerInvariant();
        return await cache.GetOrCreateAsync($"senamhi:forecast:{slug}", async e =>
        {
            e.AbsoluteExpirationRelativeToNow = ForecastTtl;
            var html = await GetAsync($"{BaseUrl}main.php?dp={Uri.EscapeDataString(slug)}&p=pronostico-meteorologico", ct);
            var result = ParseForecast(html);
            logger.LogInformation("SENAMHI pronóstico {Dep}: {Count} ciudades", slug, result.Count);
            return result;
        }) ?? [];
    }

    public async Task<IReadOnlyList<WeatherWarning>> GetWarningsAsync(CancellationToken ct = default)
    {
        return await cache.GetOrCreateAsync("senamhi:warnings", async e =>
        {
            e.AbsoluteExpirationRelativeToNow = WarningsTtl;
            var listHtml = await GetAsync($"{BaseUrl}?p=aviso-meteorologico", ct);
            var rows = ParseWarningList(listHtml);

            // Descripción: la página de un aviso vigente muestra el detalle de todos los avisos activos
            var details = new Dictionary<int, (string Summary, List<string> Details)>();
            var activeLink = rows.FirstOrDefault(r => r.Status is "vigente" or "emitido")?.Url;
            if (!string.IsNullOrEmpty(activeLink))
            {
                try
                {
                    details = ParseWarningDetails(await GetAsync(activeLink, ct));
                }
                catch (HttpRequestException ex)
                {
                    logger.LogWarning(ex, "No se pudo leer el detalle de los avisos del SENAMHI");
                }
            }

            var result = rows.Select(r =>
            {
                var d = details.GetValueOrDefault(r.Number);
                return new WeatherWarning(r.Number, r.Title, r.Level, r.Status, r.Issued, r.Start, r.End,
                    d.Summary ?? string.Empty, d.Details ?? [], r.Url);
            }).ToList();
            logger.LogInformation("SENAMHI avisos: {Count} leídos", result.Count);
            return result;
        }) ?? [];
    }

    // ---------------------------------------------------------------- Pronóstico

    /// <summary>
    /// La página lista, por ciudad, "CIUDAD - DEPARTAMENTO" seguido de bloques
    /// "día, dd de mes" / "máx°C" / "mín°C" / "descripción".
    /// </summary>
    private static List<CityForecast> ParseForecast(string html)
    {
        var lines = ToLines(html);
        var result = new List<CityForecast>();
        string? city = null, dep = null;
        var days = new List<DayForecast>();

        void Flush()
        {
            if (city is not null && days.Count > 0) result.Add(new CityForecast(city, dep!, days.ToList()));
            days.Clear();
        }

        for (var i = 0; i < lines.Count; i++)
        {
            var cityMatch = CityLine().Match(lines[i]);
            if (cityMatch.Success && i + 1 < lines.Count && DayLine().IsMatch(lines[i + 1]))
            {
                Flush();
                city = Title(cityMatch.Groups[1].Value);
                dep = Title(cityMatch.Groups[2].Value);
                continue;
            }

            var dayMatch = DayLine().Match(lines[i]);
            if (city is null || !dayMatch.Success || i + 3 >= lines.Count) continue;
            if (!Months.TryGetValue(Fix(dayMatch.Groups[2].Value).ToLowerInvariant(), out var month)) continue;

            var day = int.Parse(dayMatch.Groups[1].Value, CultureInfo.InvariantCulture);
            var date = InferDate(day, month);
            days.Add(new DayForecast(date, Temp(lines[i + 1]), Temp(lines[i + 2]), Fix(lines[i + 3])));
            i += 3;
        }
        Flush();
        return result;
    }

    // ---------------------------------------------------------------- Avisos

    private record WarningRow(int Number, string Title, string Level, string Status, DateOnly Issued, DateOnly Start, DateOnly End, string Url);

    /// <summary>Tabla de avisos: Aviso | Nro. | Emisión | Inicio | Fin | Duración | Nivel.</summary>
    private static List<WarningRow> ParseWarningList(string html)
    {
        var rows = new List<WarningRow>();
        var tbody = html.IndexOf("<tbody>", StringComparison.OrdinalIgnoreCase);
        if (tbody < 0) return rows;

        foreach (Match tr in TableRow().Matches(html[tbody..]))
        {
            var cells = TableCell().Matches(tr.Value).Select(m => Clean(m.Groups[1].Value)).ToList();
            if (cells.Count < 7) continue;

            var numMatch = Regex.Match(cells[1], @"(\d+)");
            if (!numMatch.Success) continue;
            if (!DateOnly.TryParse(cells[2], CultureInfo.InvariantCulture, out var issued) ||
                !DateOnly.TryParse(cells[3], CultureInfo.InvariantCulture, out var start) ||
                !DateOnly.TryParse(cells[4], CultureInfo.InvariantCulture, out var end)) continue;

            var title = Fix(cells[0]);
            var status = cells[1].Contains("vigente", StringComparison.OrdinalIgnoreCase) ? "vigente"
                : cells[1].Contains("emitido", StringComparison.OrdinalIgnoreCase) ? "emitido"
                : title.Contains("CANCELADO", StringComparison.OrdinalIgnoreCase) ? "cancelado"
                : "finalizado";
            var href = Regex.Match(tr.Value, "href=\"\\.?/?([^\"]+)\"").Groups[1].Value;

            rows.Add(new WarningRow(int.Parse(numMatch.Groups[1].Value, CultureInfo.InvariantCulture),
                Regex.Replace(title, @"\s*\(AVISO CANCELADO\)\s*", "", RegexOptions.IgnoreCase),
                cells[6].ToUpperInvariant(), status, issued, start, end,
                string.IsNullOrEmpty(href) ? $"{BaseUrl}?p=aviso-meteorologico" : BaseUrl + WebUtility.HtmlDecode(href)));
            if (rows.Count >= 60) break; // los más recientes bastan
        }
        return rows;
    }

    /// <summary>
    /// Página de detalle: bloques "Aviso / N°452 / NIVEL / TÍTULO / … Periodo de vigencia … / párrafos".
    /// Devuelve, por número de aviso, el primer párrafo (resumen) y los párrafos por día.
    /// </summary>
    private static Dictionary<int, (string Summary, List<string> Details)> ParseWarningDetails(string html)
    {
        var lines = ToLines(html);
        var result = new Dictionary<int, (string, List<string>)>();
        for (var i = 0; i < lines.Count - 1; i++)
        {
            if (lines[i] != "Aviso") continue;
            var num = Regex.Match(lines[i + 1], @"^N\D{0,2}\s*(\d+)$");
            if (!num.Success) continue;

            var paragraphs = new List<string>();
            var j = i + 2;
            // Avanza hasta el final de la cabecera (línea "Periodo de vigencia" + "NN horas")
            while (j < lines.Count && lines[j] != "Aviso" && !lines[j].StartsWith("Periodo de vigencia", StringComparison.OrdinalIgnoreCase)) j++;
            j += 2;
            for (; j < lines.Count && lines[j] != "Aviso"; j++)
            {
                var l = lines[j];
                if (l.Length < 60 || l == "-->") continue;          // fechas sueltas, separadores
                paragraphs.Add(Fix(l));
            }
            if (paragraphs.Count > 0)
                result[int.Parse(num.Groups[1].Value, CultureInfo.InvariantCulture)] = (paragraphs[0], paragraphs.Skip(1).ToList());
            i = j - 1;
        }
        return result;
    }

    // ---------------------------------------------------------------- Utilidades

    private static async Task<string> GetAsync(string url, CancellationToken ct)
    {
        using var resp = await Http.GetAsync(url, ct);
        resp.EnsureSuccessStatusCode();
        return await resp.Content.ReadAsStringAsync(ct);
    }

    private static HttpClient CreateHttp()
    {
        var http = new HttpClient { Timeout = TimeSpan.FromSeconds(25) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36");
        return http;
    }

    /// <summary>HTML → líneas de texto limpias (sin scripts ni etiquetas).</summary>
    private static List<string> ToLines(string html)
    {
        var noScripts = ScriptOrStyle().Replace(html, " ");
        var text = WebUtility.HtmlDecode(Tag().Replace(noScripts, "\n"));
        return text.Split('\n')
            .Select(l => Spaces().Replace(l, " ").Trim())
            .Where(l => l.Length > 0)
            .ToList();
    }

    private static string Clean(string cellHtml) =>
        Spaces().Replace(WebUtility.HtmlDecode(Tag().Replace(cellHtml, " ")), " ").Trim();

    private static int? Temp(string s)
    {
        var m = Regex.Match(s, @"(-?\d+)");
        return m.Success ? int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture) : null;
    }

    /// <summary>La página trae día y mes sin año: se elige el año más cercano a hoy (cambio de año en diciembre/enero).</summary>
    private static DateOnly InferDate(int day, int month)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-5)); // hora del Perú
        var candidates = new[] { today.Year - 1, today.Year, today.Year + 1 }
            .Where(y => day <= DateTime.DaysInMonth(y, month))
            .Select(y => new DateOnly(y, month, day));
        return candidates.OrderBy(d => Math.Abs(d.DayNumber - today.DayNumber)).First();
    }

    private static string Title(string s) => CultureInfo.GetCultureInfo("es-PE").TextInfo.ToTitleCase(Fix(s).Trim().ToLowerInvariant());

    /// <summary>
    /// La web del SENAMHI pierde algunas tildes (aparecen como "�"). Se reparan los casos frecuentes;
    /// lo que no se puede reparar se deja sin el carácter dañado.
    /// </summary>
    public static string Fix(string s)
    {
        if (!s.Contains('\uFFFD')) return s;
        const char X = '\uFFFD';
        var fixes = new (string Bad, string Good)[]
        {
            ($"{X}C", "°C"), ($"N{X}", "N°"), ($"ci{X}n", "ción"), ($"CI{X}N", "CIÓN"), ($"si{X}n", "sión"), ($"SI{X}N", "SIÓN"),
            ($"d{X}a", "día"), ($"D{X}A", "DÍA"), ($"Mi{X}rcoles", "Miércoles"), ($"mi{X}rcoles", "miércoles"),
            ($"S{X}bado", "Sábado"), ($"s{X}bado", "sábado"), ($"D{X}CIMO", "DÉCIMO"), ($"pa{X}s", "país"),
            ($"r{X}fagas", "ráfagas"), ($"el{X}ctric", "eléctric"), ($"acompa{X}", "acompañ"), ($"ma{X}ana", "mañana"),
            ($"fr{X}o", "frío"), ($"FR{X}O", "FRÍO"), ($"pr{X}xim", "próxim"), ($"m{X}xim", "máxim"), ($"M{X}x", "Máx"),
            ($"m{X}nim", "mínim"), ($"M{X}n", "Mín"), ($"prev{X}n", "prevén"), ($"prev{X}", "prevé"), ($"Pron{X}stico", "Pronóstico"),
            ($"pron{X}stico", "pronóstico"), ($"r{X}o", "río"), ($"R{X}O", "RÍO"), ($"temperatura{X}", "temperatura"),
            ($"atl{X}ntic", "atlántic"), ($"Amaz{X}n", "Amazon"), ($"amaz{X}n", "amazon"), ($"Jun{X}n", "Junín"), ($"JUN{X}N", "JUNÍN"),
            ($"Hu{X}nuco", "Huánuco"), ($"HU{X}NUCO", "HUÁNUCO"), ($"Apur{X}mac", "Apurímac"), ($"APUR{X}MAC", "APURÍMAC"),
            ($"{X}ncash", "Áncash"), ($"{X}NCASH", "ÁNCASH"), ($"Mart{X}n", "Martín"), ($"MART{X}N", "MARTÍN"),
            ($"m s. n. m", "m s. n. m"),
        };
        foreach (var (bad, good) in fixes) s = s.Replace(bad, good, StringComparison.Ordinal);

        // Futuros: "continuará(n)", "estará(n)", "presentará"… y condicionales "incrementaría"
        s = Regex.Replace(s, $@"(\p{{L}}+[aei]r){X}(n?)\b", "$1á$2");
        s = Regex.Replace(s, $@"(\p{{L}}+r){X}a\b", "$1ía");
        return s.Replace(X.ToString(), string.Empty);
    }

    [GeneratedRegex(@"<(script|style)\b.*?</\1>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex ScriptOrStyle();

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex Tag();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();

    [GeneratedRegex(@"<tr\b.*?</tr>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex TableRow();

    [GeneratedRegex(@"<td\b[^>]*>(.*?)</td>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex TableCell();

    /// <summary>"CHULUCANAS - PIURA"</summary>
    [GeneratedRegex(@"^([A-ZÁÉÍÓÚÑ\uFFFD .'()-]+?)\s+-\s+([A-ZÁÉÍÓÚÑ\uFFFD .'-]+)$")]
    private static partial Regex CityLine();

    /// <summary>"viernes, 06 de noviembre"</summary>
    [GeneratedRegex(@"^\S+,\s*(\d{1,2})\s+de\s+(\S+)$", RegexOptions.IgnoreCase)]
    private static partial Regex DayLine();
}

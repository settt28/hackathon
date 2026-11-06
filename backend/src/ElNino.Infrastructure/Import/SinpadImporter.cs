using System.Globalization;
using System.IO.Compression;
using System.Text;
using ElNino.Core.Entities;
using ElNino.Core.Services;
using ElNino.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ElNino.Infrastructure.Import;

/// <summary>
/// Importa las emergencias oficiales del INDECI registradas en el SINPAD,
/// dataset "Emergencias y daños a nivel nacional" de la Plataforma Nacional de Datos Abiertos (licencia ODC-By).
///
/// Los CSV oficiales se guardan sin modificar dentro de un zip (data/sinpad/sinpad_emergencias.zip).
/// Formato: latin-1 separado por ';'. Fechas "dd/mm/aaaa" (hasta 2024) o "mm/dd/aa" (2025 en adelante).
/// Nota del INDECI: la ubicación es la del distrito que registra la emergencia.
/// </summary>
public class SinpadImporter(AppDbContext db)
{
    private const string Prefix = "SINPAD-";
    private static readonly TextInfo Title = new CultureInfo("es-PE").TextInfo;

    // Columnas (mismo orden en todos los archivos publicados, aunque cambien los nombres de cabecera)
    private const int ColCode = 0, ColDate = 1, ColYear = 2, ColMonth = 3, ColUbigeo = 4, ColDep = 5, ColProv = 6,
        ColDist = 7, ColHazard = 8, ColRegion = 10, ColDeaths = 11, ColMissing = 12, ColDamnified = 14, ColAffected = 15,
        ColHousesDestroyed = 16, ColHousesDamaged = 17;

    private static readonly Dictionary<string, int> Months = new()
    {
        ["ENERO"] = 1, ["FEBRERO"] = 2, ["MARZO"] = 3, ["ABRIL"] = 4, ["MAYO"] = 5, ["JUNIO"] = 6, ["JULIO"] = 7,
        ["AGOSTO"] = 8, ["SETIEMBRE"] = 9, ["SEPTIEMBRE"] = 9, ["OCTUBRE"] = 10, ["NOVIEMBRE"] = 11, ["DICIEMBRE"] = 12,
    };

    /// <summary>Descarga los CSV oficiales y los guarda, sin modificar, dentro del zip indicado (lo reemplaza).</summary>
    public static async Task DownloadAsync(IEnumerable<string> urls, string zipPath, CancellationToken ct = default)
    {
        var tmpDir = Path.Combine(Path.GetTempPath(), "sinpad-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tmpDir);
        try
        {
            foreach (var url in urls)
            {
                var name = Uri.UnescapeDataString(Path.GetFileName(new Uri(url).AbsolutePath));
                await Downloader.DownloadFileAsync(url, Path.Combine(tmpDir, name), ct);
            }

            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(zipPath))!);
            var tmpZip = zipPath + ".tmp";
            File.Delete(tmpZip);
            ZipFile.CreateFromDirectory(tmpDir, tmpZip, CompressionLevel.SmallestSize, includeBaseDirectory: false);
            File.Move(tmpZip, zipPath, overwrite: true);
        }
        finally
        {
            Directory.Delete(tmpDir, recursive: true);
        }
    }

    /// <summary>Reemplaza los eventos del SINPAD con los de todos los CSV del zip, desde <paramref name="minYear"/>.</summary>
    public async Task<ImportResult> ImportAsync(string zipPath, int minYear, CancellationToken ct = default)
    {
        if (!File.Exists(zipPath))
            throw new FileNotFoundException($"No se encontró el zip del SINPAD: {zipPath}");

        int read = 0, skippedType = 0, skippedOther = 0, minY = int.MaxValue, maxY = 0;
        var events = new List<HistoricalEvent>();
        var seen = new HashSet<string>();
        // Región natural (COSTA/SIERRA/SELVA) más frecuente por distrito, para completar la tabla de distritos
        var regions = new Dictionary<string, Dictionary<string, int>>();

        using var zip = ZipFile.OpenRead(zipPath);
        foreach (var entry in zip.Entries.Where(e => e.Name.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)).OrderBy(e => e.Name))
        {
            using var sr = new StreamReader(entry.Open(), Encoding.Latin1);
            await sr.ReadLineAsync(ct); // cabecera
            while (await sr.ReadLineAsync(ct) is { } line)
            {
                ct.ThrowIfCancellationRequested();
                if (string.IsNullOrWhiteSpace(line)) continue;
                read++;
                var c = SplitCsv(line);
                if (c.Count <= ColHousesDamaged) { skippedOther++; continue; }

                var region = TextNormalizer.Normalize(c[ColRegion]).ToUpperInvariant();
                if (region is "COSTA" or "SIERRA" or "SELVA")
                {
                    var key = c[ColUbigeo].Trim().PadLeft(6, '0');
                    if (!regions.TryGetValue(key, out var counts)) regions[key] = counts = [];
                    counts[region] = counts.GetValueOrDefault(region) + 1;
                }

                // Filtro por año antes de todo lo demás (más rápido)
                if (!int.TryParse(c[ColYear].Trim(), out var year) || year < minYear) { skippedOther++; continue; }

                var hazard = HazardMapper.Map(c[ColHazard]);
                if (hazard is null) { skippedType++; continue; }

                var ubigeo = c[ColUbigeo].Trim().PadLeft(6, '0');
                if (ubigeo.Length != 6 || !ParseDate(c[ColDate], year, c[ColMonth], out var date, out var precision))
                {
                    skippedOther++;
                    continue;
                }

                // Algunos códigos se repiten para eventos distintos: la clave incluye distrito, fecha y peligro
                var externalId = $"{Prefix}{c[ColCode].Trim()}-{ubigeo}-{date:yyyyMMdd}-{hazard}";
                if (!seen.Add(externalId)) { skippedOther++; continue; }

                var deaths = Int(c[ColDeaths]) + Int(c[ColMissing]);
                var affected = Int(c[ColDamnified]) + Int(c[ColAffected]);
                var destroyed = Int(c[ColHousesDestroyed]);
                var district = Pretty(c[ColDist]);
                var sourceType = Pretty(c[ColHazard]);

                events.Add(new HistoricalEvent
                {
                    ExternalId = externalId,
                    Ubigeo = ubigeo,
                    District = district,
                    Province = Pretty(c[ColProv]),
                    Department = Pretty(c[ColDep]),
                    Hazard = hazard.Value,
                    SourceEventType = sourceType,
                    Date = date,
                    DatePrecision = precision,
                    Severity = HazardMapper.Severity(deaths, affected, destroyed, Int(c[ColHousesDamaged])),
                    Description = HazardMapper.Describe(sourceType, district, string.Empty, deaths, affected, destroyed),
                    Deaths = deaths,
                    Affected = affected,
                    HousesDestroyed = destroyed,
                    Source = $"INDECI – SINPAD (emergencia {c[ColCode].Trim()})",
                });
                minY = Math.Min(minY, date.Year);
                maxY = Math.Max(maxY, date.Year);
            }
        }

        await HistoricalEventWriter.ReplaceAsync(db, Prefix, events, ct);
        await UpdateNaturalRegionsAsync(regions, ct);
        return new ImportResult("INDECI – SINPAD", read, events.Count, skippedType, skippedOther, events.Count == 0 ? 0 : minY, maxY);
    }

    private async Task UpdateNaturalRegionsAsync(Dictionary<string, Dictionary<string, int>> regions, CancellationToken ct)
    {
        var districts = await db.Districts.ToListAsync(ct);
        foreach (var d in districts)
            if (regions.TryGetValue(d.Ubigeo, out var counts))
                d.NaturalRegion = counts.OrderByDescending(kv => kv.Value).First().Key;
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
    }

    /// <summary>
    /// Fecha del evento. El año y el mes se toman de sus columnas (fiables); el día, del texto de fecha,
    /// que viene como dd/mm/aaaa o mm/dd/aa según el año.
    /// </summary>
    private static bool ParseDate(string text, int year, string monthText, out DateTime date, out string precision)
    {
        date = default;
        precision = "mes";
        if (year > 2100) return false;
        if (!Months.TryGetValue(TextNormalizer.Normalize(monthText).ToUpperInvariant(), out var month)) return false;

        var day = 1;
        var parts = text.Trim().Split('/');
        if (parts.Length == 3 && int.TryParse(parts[0], out var a) && int.TryParse(parts[1], out var b))
        {
            // dd/mm/aaaa → (a=día, b=mes) ; mm/dd/aa → (a=mes, b=día). Se elige la lectura que coincide con el mes.
            var candidate = parts[2].Length == 4 ? (Day: a, Month: b) : (Day: b, Month: a);
            if (candidate.Month != month && a == month) candidate = (b, a);
            if (candidate.Month == month && candidate.Day >= 1 && candidate.Day <= DateTime.DaysInMonth(year, month))
            {
                day = candidate.Day;
                precision = "dia";
            }
        }

        date = new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc);
        return true;
    }

    private static int Int(string s) =>
        double.TryParse(s.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var n) && n > 0 ? (int)n : 0;

    private static string Pretty(string s) =>
        string.IsNullOrWhiteSpace(s) ? string.Empty : Title.ToTitleCase(s.Trim().ToLowerInvariant());

    /// <summary>Separa una línea CSV por ';' respetando comillas.</summary>
    private static List<string> SplitCsv(string line)
    {
        var result = new List<string>(50);
        var sb = new StringBuilder();
        var quoted = false;
        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (ch == '"')
            {
                if (quoted && i + 1 < line.Length && line[i + 1] == '"') { sb.Append('"'); i++; }
                else quoted = !quoted;
            }
            else if (ch == ';' && !quoted)
            {
                result.Add(sb.ToString());
                sb.Clear();
            }
            else sb.Append(ch);
        }
        result.Add(sb.ToString());
        return result;
    }
}

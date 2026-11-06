using ElNino.Core.Entities;
using ElNino.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ElNino.Infrastructure.Import;

/// <summary>Resumen de una importación.</summary>
/// <param name="CorrectedHouses">Filas con "viviendas destruidas" dudosas (copiaban a "afectados") que se tomaron como sin dato.</param>
public record ImportResult(string Source, int Read, int Imported, int SkippedType, int SkippedOther, int MinYear, int MaxYear, int CorrectedHouses = 0);

/// <summary>Reemplaza en bloque los eventos de una fuente (identificada por el prefijo de ExternalId).</summary>
internal static class HistoricalEventWriter
{
    public static async Task ReplaceAsync(AppDbContext db, string prefix, List<HistoricalEvent> events, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.HistoricalEvents.Where(e => e.ExternalId.StartsWith(prefix)).ExecuteDeleteAsync(ct);

        var autoDetect = db.ChangeTracker.AutoDetectChangesEnabled;
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try
        {
            foreach (var batch in events.Chunk(5000))
            {
                db.HistoricalEvents.AddRange(batch);
                await db.SaveChangesAsync(ct);
                db.ChangeTracker.Clear();
            }
        }
        finally
        {
            db.ChangeTracker.AutoDetectChangesEnabled = autoDetect;
        }
        await tx.CommitAsync(ct);
    }
}

/// <summary>Cliente HTTP para descargar las fuentes (algunos portales rechazan clientes sin User-Agent de navegador).</summary>
internal static class Downloader
{
    public static HttpClient CreateClient()
    {
        var http = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
        http.DefaultRequestHeaders.UserAgent.ParseAdd(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36");
        return http;
    }

    public static async Task DownloadFileAsync(string url, string path, CancellationToken ct)
    {
        using var http = CreateClient();
        using var resp = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        resp.EnsureSuccessStatusCode();
        if (resp.Content.Headers.ContentType?.MediaType == "text/html")
            throw new InvalidOperationException($"El portal devolvió una página web en lugar del archivo: {url}");

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var tmp = path + ".tmp";
        await using (var file = File.Create(tmp))
            await resp.Content.CopyToAsync(file, ct);
        File.Move(tmp, path, overwrite: true);
    }
}

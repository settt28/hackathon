using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Services;

namespace ElNino.API;

/// <summary>
/// Genera los datos que la app lleva dentro para que Paty responda sin conexión (frontend/src/lib/paty/engine.ts).
/// Sale de la misma base de datos y del mismo modelo XGBoost que usa el backend, para que no haya dos versiones.
/// Uso (al cambiar consejos, palabras de alarma, postas o el modelo):
///   dotnet run --project src/ElNino.API -- --export-offline ../../../frontend
/// (la ruta es relativa a src/ElNino.API, que es desde donde arranca "dotnet run")
/// </summary>
public static class OfflineExport
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        Converters = { new JsonStringEnumConverter() },
    };

    public static async Task RunAsync(IServiceProvider services, string frontendDir, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        // --- Conocimiento: va en el bundle principal, debe estar siempre disponible ---
        var enfen = (await sp.GetRequiredService<IRepository<Bulletin>>().ListAsync(b => b.Institution == "ENFEN", ct))
            .MaxBy(b => b.PublishedAt);
        var keywords = await sp.GetRequiredService<IRepository<AlarmKeyword>>().GetAllAsync(ct);
        var tips = await sp.GetRequiredService<IRepository<PreventionTip>>().GetAllAsync(ct);
        await WriteAsync(Path.Combine(frontendDir, "src", "data", "offline", "knowledge.json"), new
        {
            keywords = keywords.Select(k => new { k.Term, k.Level, k.EmergencyType }),
            tips = tips.Select(t => new { t.Id, t.Hazard, t.Phase, t.Topic, t.Title, t.Steps, t.Keywords, t.Source, t.SourceUrl }),
            enfen = enfen is null ? null : new { enfen.Title, enfen.PublishedAt, enfen.AlertStatus, enfen.Summary },
        }, ct);

        // --- Postas: [nombre, tipo, atiende emergencias, lat, lon, teléfono] ---
        var centers = await sp.GetRequiredService<IRepository<HealthCenter>>().ListAsync(_ => true, ct);
        await WriteAsync(Path.Combine(frontendDir, "public", "offline", "centers.json"),
            centers.Select(c => new object?[]
            {
                c.Name, c.Type, c.HandlesEmergencies ? 1 : 0, Math.Round(c.Latitude, 5), Math.Round(c.Longitude, 5), c.Phone,
            }), ct);

        // --- Distritos: límites, y riesgo de los próximos 12 meses según el modelo XGBoost ---
        var districts = await sp.GetRequiredService<IRepository<District>>().ListAsync(_ => true, ct);
        var ubigeos = districts.Select(d => d.Ubigeo).ToList();
        var model = sp.GetRequiredService<RiskModelService>();
        var history = sp.GetRequiredService<ZoneHistoryService>();
        var now = DateTime.UtcNow.AddHours(-5);

        // Índice 0 = enero. Cada mes usa su próxima ocurrencia. Solo el mes en curso sabe del boletín vigente del ENFEN.
        var byMonth = new IReadOnlyDictionary<string, RiskPrediction>[12];
        for (var m = 1; m <= 12; m++)
            byMonth[m - 1] = await model.PredictAsync(ubigeos, m >= now.Month ? now.Year : now.Year + 1, m, ct);

        var rows = new List<object>(districts.Count);
        foreach (var d in districts)
        {
            var top = (await history.GetSummaryAsync(d.Ubigeo, maxEvents: 0, ct: ct)).Hazards.FirstOrDefault();
            var preds = byMonth.Select(p => p.GetValueOrDefault(d.Ubigeo)).ToList();
            rows.Add(new
            {
                u = d.Ubigeo, n = d.Name, p = d.Province, d = d.Department,
                b = new[] { Round(d.MinLat), Round(d.MaxLat), Round(d.MinLon), Round(d.MaxLon) },
                r = string.Concat(preds.Select(x => x?.Level.ToString() ?? "-")),
                pr = preds.Select(x => x is null ? -1 : (int)Math.Round(x.Probability * 100)),
                h = top?.Hazard,
                hn = top is null ? null : ZoneHistoryService.HazardName(top.Hazard),
                g = RoundCoords(JsonNode.Parse(d.GeoJson)),
            });
        }
        await WriteAsync(Path.Combine(frontendDir, "public", "offline", "districts.json"), rows, ct);
    }

    private static double Round(double v) => Math.Round(v, 4);

    /// <summary>4 decimales (~11 m) sobran para saber el distrito y reducen bastante el archivo.</summary>
    private static JsonNode? RoundCoords(JsonNode? node)
    {
        switch (node)
        {
            case JsonArray arr:
                for (var i = 0; i < arr.Count; i++)
                    arr[i] = arr[i] is JsonValue v && v.TryGetValue<double>(out var n) ? Round(n) : RoundCoords(arr[i]?.DeepClone());
                return arr;
            case JsonObject obj:
                foreach (var key in obj.Select(kv => kv.Key).ToList())
                    if (obj[key] is JsonArray) obj[key] = RoundCoords(obj[key]!.DeepClone());
                return obj;
            default:
                return node;
        }
    }

    private static async Task WriteAsync(string path, object value, CancellationToken ct)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllTextAsync(path, JsonSerializer.Serialize(value, Json), ct);
    }
}

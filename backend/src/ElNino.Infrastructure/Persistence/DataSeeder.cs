using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using ElNino.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ElNino.Infrastructure.Persistence;

/// <summary>
/// Crea la base de datos y carga los datos iniciales desde los JSON de Persistence/Seed.
/// Solo inserta en tablas vacías, salvo consejos y palabras de alarma, que se recargan en cada arranque.
/// Para recargar todo, borrar el archivo elnino.db y reiniciar la API.
/// </summary>
public static class DataSeeder
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static async Task SeedAsync(AppDbContext db, ILogger logger, CancellationToken ct = default)
    {
        // Sin migraciones para el hackathon: crea las tablas si no existen.
        await db.Database.EnsureCreatedAsync(ct);

        // Consejos y palabras de alarma los define el repositorio: se recargan siempre, para que una base
        // ya creada no se quede sin las correcciones (una palabra de alarma que falta es una emergencia sin detectar).
        await db.PreventionTips.ExecuteDeleteAsync(ct);
        await db.AlarmKeywords.ExecuteDeleteAsync(ct);

        await SeedTable(db, db.HealthCenters, "health_centers.json", logger, ct);
        await SeedTable(db, db.PreventionTips, "prevention_tips.json", logger, ct);
        await SeedTable(db, db.RiskZones, "risk_zones.json", logger, ct);
        await SeedTable(db, db.AlarmKeywords, "alarm_keywords.json", logger, ct);
        await SeedTable(db, db.Alerts, "alerts.json", logger, ct);
        await SeedTable(db, db.Bulletins, "bulletins.json", logger, ct);
    }

    private static async Task SeedTable<T>(AppDbContext db, DbSet<T> set, string file, ILogger logger, CancellationToken ct)
        where T : BaseEntity
    {
        if (await set.AnyAsync(ct)) return;

        var items = Read<T>(file);
        if (items.Count == 0) return;

        set.AddRange(items);
        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seed: {Count} registros cargados en {Table}", items.Count, typeof(T).Name);
    }

    private static List<T> Read<T>(string file)
    {
        var asm = Assembly.GetExecutingAssembly();
        var name = asm.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith($".Seed.{file}", StringComparison.Ordinal));
        if (name is null) return [];

        using var stream = asm.GetManifestResourceStream(name)!;
        return JsonSerializer.Deserialize<List<T>>(stream, Json) ?? [];
    }
}

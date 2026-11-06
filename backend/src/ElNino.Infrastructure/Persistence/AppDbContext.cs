using ElNino.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ElNino.Infrastructure.Persistence;

/// <summary>
/// Contexto de EF Core. En el hackathon usa SQLite (un solo archivo, sin servidor);
/// para producción basta cambiar UseSqlite por UseNpgsql (PostgreSQL).
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<HealthCenter> HealthCenters => Set<HealthCenter>();
    public DbSet<PreventionTip> PreventionTips => Set<PreventionTip>();
    public DbSet<HistoricalEvent> HistoricalEvents => Set<HistoricalEvent>();
    public DbSet<RiskZone> RiskZones => Set<RiskZone>();
    public DbSet<AlarmKeyword> AlarmKeywords => Set<AlarmKeyword>();
    public DbSet<District> Districts => Set<District>();
    public DbSet<Bulletin> Bulletins => Set<Bulletin>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        // Enums como texto: la BD se lee fácil en DB Browser / SQLite Viewer
        b.Properties<AlertDomain>().HaveConversion<string>();
        b.Properties<RiskLevel>().HaveConversion<string>();
        b.Properties<HazardType>().HaveConversion<string>();
        b.Properties<EventPhase>().HaveConversion<string>();
        b.Properties<TriageLevel>().HaveConversion<string>();
        b.Properties<EmergencyType>().HaveConversion<string>();
        b.Properties<ZoneType>().HaveConversion<string>();

        // SQLite no guarda el tipo de fecha: todas las fechas se tratan como UTC al leer,
        // así el JSON sale con "Z" y el frontend no las confunde con hora local.
        b.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        b.Properties<DateTime?>().HaveConversion<UtcDateTimeConverter>();
    }

    internal sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
        // Fechas sin zona (ej. "2017-03-27" de los JSON semilla) se toman tal cual como UTC, sin desplazarlas
        v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : DateTime.SpecifyKind(v, DateTimeKind.Utc),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<Alert>(e =>
        {
            e.ToTable("alerts");
            e.HasIndex(x => new { x.Ubigeo, x.Domain });
        });

        m.Entity<HealthCenter>(e =>
        {
            e.ToTable("health_centers");
            e.HasIndex(x => x.Code).IsUnique();
            e.HasIndex(x => new { x.Latitude, x.Longitude });
            e.HasIndex(x => x.Ubigeo);
        });

        // Steps y Keywords (List<string>) se guardan como JSON automáticamente (EF Core 8+)
        m.Entity<PreventionTip>(e =>
        {
            e.ToTable("prevention_tips");
            e.HasIndex(x => x.Domain);
        });

        m.Entity<HistoricalEvent>(e =>
        {
            e.ToTable("historical_events");
            e.HasIndex(x => new { x.Ubigeo, x.Hazard });
            e.HasIndex(x => x.ExternalId);
        });

        m.Entity<Bulletin>(e =>
        {
            e.ToTable("bulletins");
            e.HasIndex(x => new { x.Institution, x.PublishedAt });
            e.HasIndex(x => new { x.Institution, x.Number }).IsUnique();
        });

        m.Entity<District>(e =>
        {
            e.ToTable("districts");
            e.HasIndex(x => x.Ubigeo).IsUnique();
            e.HasIndex(x => new { x.MinLat, x.MaxLat, x.MinLon, x.MaxLon });
        });

        m.Entity<RiskZone>(e =>
        {
            e.ToTable("risk_zones");
            e.HasIndex(x => x.Ubigeo);
        });

        m.Entity<AlarmKeyword>(e =>
        {
            e.ToTable("alarm_keywords");
            e.HasIndex(x => x.Term).IsUnique();
        });
    }
}

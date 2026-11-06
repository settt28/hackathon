using ElNino.Core.Interfaces;
using ElNino.Infrastructure.Ai;
using ElNino.Infrastructure.Import;
using ElNino.Infrastructure.Persistence;
using ElNino.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ElNino.Infrastructure;

/// <summary>
/// Punto único de registro de servicios de infraestructura.
/// La API solo llama a AddInfrastructure() sin conocer las implementaciones concretas.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString,
        DataImportOptions? importOptions = null)
    {
        services.AddDbContext<AppDbContext>(o => o.UseSqlite(connectionString));

        services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
        services.AddScoped<IAlertRepository, EfAlertRepository>();

        // Importación de datos reales (distritos INEI, emergencias SINPAD del INDECI)
        services.AddSingleton(importOptions ?? new DataImportOptions());
        services.AddScoped<DistrictImporter>();
        services.AddScoped<SinpadImporter>();
        services.AddScoped<DataImportService>();

        // Sin IA conectada: Paty responde con plantillas. Reemplazar por una implementación real.
        services.AddSingleton<IChatModel, NullChatModel>();
        return services;
    }

    /// <summary>
    /// Crea la BD (si no existe), carga los datos semilla y, si están vacías, las tablas de
    /// distritos e historial desde los archivos locales. Llamar una vez al arrancar.
    /// </summary>
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DataSeeder");
        await DataSeeder.SeedAsync(db, logger, ct);

        var importer = scope.ServiceProvider.GetRequiredService<DataImportService>();
        try
        {
            await importer.ImportIfEmptyAsync(ct);
        }
        catch (Exception ex) when (ex is IOException or InvalidOperationException or UnauthorizedAccessException)
        {
            // La API debe arrancar aunque falte algún archivo de datos
            logger.LogError(ex, "No se pudieron importar distritos/historial al arrancar.");
        }
    }
}

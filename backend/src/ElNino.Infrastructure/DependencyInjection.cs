using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Infrastructure.Ai;
using ElNino.Infrastructure.External;
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
        DataImportOptions? importOptions = null, AiOptions? ai = null)
    {
        // Pool: reutiliza instancias de DbContext en vez de construir una (y su modelo) en cada petición
        services.AddDbContextPool<AppDbContext>(o => o.UseSqlite(connectionString));
        services.AddMemoryCache();

        services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
        services.AddScoped<IAlertRepository, EfAlertRepository>();

        // Catálogos que no cambian mientras el servidor corre: se leen una vez y se sirven desde memoria.
        // Es lo que más baja el tiempo de respuesta (ver CachedRepository). Las alertas NO se cachean:
        // el operador las publica en caliente y deben verse al instante.
        services.AddScoped<IRepository<District>, CachedRepository<District>>();
        services.AddScoped<IRepository<HealthCenter>, CachedRepository<HealthCenter>>();
        services.AddScoped<IRepository<HistoricalEvent>, CachedRepository<HistoricalEvent>>();
        services.AddScoped<IRepository<PreventionTip>, CachedRepository<PreventionTip>>();
        services.AddScoped<IRepository<AlarmKeyword>, CachedRepository<AlarmKeyword>>();
        services.AddScoped<IRepository<RiskZone>, CachedRepository<RiskZone>>();
        services.AddScoped<IRepository<Bulletin>, CachedRepository<Bulletin>>();

        // Importación de datos reales (distritos INEI, emergencias SINPAD del INDECI)
        services.AddSingleton(importOptions ?? new DataImportOptions());
        services.AddScoped<DistrictImporter>();
        services.AddScoped<SinpadImporter>();
        services.AddScoped<DataImportService>();

        // SENAMHI: pronóstico y avisos meteorológicos (lectura de su web, con caché)
        services.AddSingleton<ISenamhiClient, SenamhiClient>();

        // IA y voz: cada pieza se activa sola si está configurada en "Ai"; si no, Paty sigue funcionando sin ella
        ai ??= new AiOptions();
        if (ai.Chat.IsConfigured)
            services.AddSingleton<IChatModel>(sp => new OpenAiCompatibleChatModel(ai.Chat, sp.GetRequiredService<ILogger<OpenAiCompatibleChatModel>>()));
        else
            services.AddSingleton<IChatModel, NullChatModel>();

        if (ai.Stt.IsConfigured)
            services.AddSingleton<ISpeechToText>(sp => new WhisperSpeechToText(ai.Stt, sp.GetRequiredService<ILogger<WhisperSpeechToText>>()));
        else
            services.AddSingleton<ISpeechToText, NullSpeechToText>();

        if (ai.Tts.IsConfigured)
            services.AddSingleton<ITextToSpeech>(sp => new FishAudioTextToSpeech(ai.Tts, sp.GetRequiredService<ILogger<FishAudioTextToSpeech>>()));
        else
            services.AddSingleton<ITextToSpeech, NullTextToSpeech>();
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

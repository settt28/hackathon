using ElNino.Core.Interfaces;
using ElNino.Infrastructure.Repositories;
using Microsoft.Extensions.DependencyInjection;

namespace ElNino.Infrastructure;

/// <summary>
/// Punto único de registro de servicios de infraestructura.
/// La API solo llama a AddInfrastructure() sin conocer las implementaciones concretas.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddSingleton<IAlertRepository, InMemoryAlertRepository>();
        return services;
    }
}

using ElNino.Core.Entities;

namespace ElNino.Core.Interfaces;

/// <summary>Repositorio especializado para alertas, con filtro por dominio y vigencia.</summary>
public interface IAlertRepository : IRepository<Alert>
{
    Task<IReadOnlyList<Alert>> GetByDomainAsync(AlertDomain domain, CancellationToken ct = default);

    /// <summary>Alertas vigentes (sin vencer), opcionalmente filtradas por distrito y dominio.</summary>
    Task<IReadOnlyList<Alert>> GetActiveAsync(string? ubigeo = null, AlertDomain? domain = null, CancellationToken ct = default);
}

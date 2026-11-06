using ElNino.Core.Entities;

namespace ElNino.Core.Interfaces;

/// <summary>Repositorio especializado para alertas, con filtro por dominio.</summary>
public interface IAlertRepository : IRepository<Alert>
{
    Task<IReadOnlyList<Alert>> GetByDomainAsync(AlertDomain domain, CancellationToken ct = default);
}

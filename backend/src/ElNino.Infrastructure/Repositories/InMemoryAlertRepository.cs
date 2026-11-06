using System.Collections.Concurrent;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;

namespace ElNino.Infrastructure.Repositories;

/// <summary>
/// Implementación en memoria para el arranque del proyecto.
/// Reemplazar por un repositorio con EF Core / base de datos cuando se defina la persistencia.
/// </summary>
public class InMemoryAlertRepository : IAlertRepository
{
    private readonly ConcurrentDictionary<Guid, Alert> _store = new();

    public Task<IReadOnlyList<Alert>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Alert>>(_store.Values.ToList());

    public Task<Alert?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Task.FromResult(_store.TryGetValue(id, out var a) ? a : null);

    public Task<IReadOnlyList<Alert>> GetByDomainAsync(AlertDomain domain, CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<Alert>>(_store.Values.Where(a => a.Domain == domain).ToList());

    public Task<Alert> AddAsync(Alert entity, CancellationToken ct = default)
    {
        _store[entity.Id] = entity;
        return Task.FromResult(entity);
    }
}

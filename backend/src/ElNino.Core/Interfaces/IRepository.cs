using System.Linq.Expressions;
using ElNino.Core.Entities;

namespace ElNino.Core.Interfaces;

/// <summary>
/// Contrato genérico de acceso a datos. Core define la interfaz;
/// Infrastructure provee la implementación (inversión de dependencias).
/// </summary>
public interface IRepository<T> where T : BaseEntity
{
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default);
    Task<T> AddAsync(T entity, CancellationToken ct = default);
}

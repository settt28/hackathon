using System.Linq.Expressions;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ElNino.Infrastructure.Repositories;

/// <summary>Repositorio genérico sobre EF Core. Las lecturas no rastrean cambios (más rápidas).</summary>
public class EfRepository<T>(AppDbContext db) : IRepository<T> where T : BaseEntity
{
    protected readonly AppDbContext Db = db;

    public virtual async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default) =>
        await Db.Set<T>().AsNoTracking().ToListAsync(ct);

    public virtual Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Db.Set<T>().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);

    public virtual async Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>> predicate, CancellationToken ct = default) =>
        await Db.Set<T>().AsNoTracking().Where(predicate).ToListAsync(ct);

    public virtual async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        Db.Set<T>().Add(entity);
        await Db.SaveChangesAsync(ct);
        return entity;
    }
}

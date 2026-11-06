using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ElNino.Infrastructure.Repositories;

/// <summary>Repositorio de alertas sobre SQLite.</summary>
public class EfAlertRepository(AppDbContext db) : EfRepository<Alert>(db), IAlertRepository
{
    public async Task<IReadOnlyList<Alert>> GetByDomainAsync(AlertDomain domain, CancellationToken ct = default) =>
        await Db.Alerts.AsNoTracking()
            .Where(a => a.Domain == domain)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Alert>> GetActiveAsync(string? ubigeo = null, AlertDomain? domain = null, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var q = Db.Alerts.AsNoTracking().Where(a => a.ExpiresAt == null || a.ExpiresAt > now);
        if (!string.IsNullOrWhiteSpace(ubigeo)) q = q.Where(a => a.Ubigeo == ubigeo);
        if (domain is not null) q = q.Where(a => a.Domain == domain);
        return await q.OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
    }
}

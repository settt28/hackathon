using ElNino.Core.Entities;
using ElNino.Infrastructure.Persistence;
using Microsoft.Extensions.Caching.Memory;

namespace ElNino.Infrastructure.Repositories;

/// <summary>
/// Repositorio con la tabla entera en memoria, para los catálogos que no cambian mientras el servidor corre:
/// distritos, establecimientos de salud, consejos, palabras de alarma, zonas e historial del INDECI.
///
/// Por qué: casi toda petición necesita los distritos, y cada una volvía a leer de SQLite y a reconstruir
/// ~1 900 objetos con su polígono GeoJSON (varios MB de texto). Eso dominaba el tiempo de respuesta del mapa
/// de riesgo y del paquete offline. Los datos ocupan unos pocos MB: caben de sobra y se leen una sola vez.
///
/// Las lecturas no rastrean cambios (<see cref="EfRepository{T}"/> usa AsNoTracking), así que las instancias
/// se pueden compartir entre peticiones sin riesgo: nadie las modifica, solo se leen.
/// Si algo se inserta (ej. un boletín nuevo), <see cref="AddAsync"/> tira la copia y la siguiente lectura la rehace.
/// </summary>
public class CachedRepository<T>(AppDbContext db, IMemoryCache cache) : EfRepository<T>(db) where T : BaseEntity
{
    private static readonly string CacheKey = $"tabla:{typeof(T).FullName}";

    public override async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(CacheKey, out IReadOnlyList<T>? cached) && cached is not null) return cached;

        var all = await base.GetAllAsync(ct);
        // Son catálogos: que no los desaloje la presión de memoria, volver a leerlos cuesta más que guardarlos.
        // Si dos peticiones simultáneas lo cargan a la vez no pasa nada: el resultado es el mismo.
        cache.Set(CacheKey, all, new MemoryCacheEntryOptions { Priority = CacheItemPriority.NeverRemove });
        return all;
    }

    // ListAsync NO se sobrescribe a propósito: filtrar en memoria obliga a compilar el árbol de
    // expresión en cada llamada (~1 ms) y a recorrer la tabla entera, y medido resultó MÁS LENTO
    // que dejar que SQLite resuelva la consulta por sus índices (ver AppDbContext). Solo se cachea
    // GetAllAsync, que es el que leía el catálogo completo una y otra vez.

    public override async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        (await GetAllAsync(ct)).FirstOrDefault(x => x.Id == id);

    public override async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        var saved = await base.AddAsync(entity, ct);
        cache.Remove(CacheKey); // la copia quedó vieja: se rehace en la próxima lectura
        return saved;
    }
}

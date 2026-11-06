namespace ElNino.Core.Entities;

/// <summary>
/// Entidad base de dominio. Todas las entidades heredan un Id y fechas de auditoría.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

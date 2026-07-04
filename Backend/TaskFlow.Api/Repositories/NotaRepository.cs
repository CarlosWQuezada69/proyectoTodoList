using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public class NotaRepository : INotaRepository
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<NotaRepository> _logger;

    public NotaRepository(ApplicationDbContext context, ILogger<NotaRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResponse<Nota>> GetAllByUserAsync(int usuarioId, bool archivadas = false, int page = 1, int pageSize = 50)
    {
        pageSize = Math.Min(pageSize, 100);

        var query = _context.Notas
            .Where(n => n.UsuarioId == usuarioId && !n.IsDeleted && n.Archivada == archivadas);

        var total = await query.CountAsync();

        var items = await query
            .Include(n => n.Tareas.OrderBy(t => t.Id))
            .Include(n => n.NotaEtiquetas).ThenInclude(ne => ne.Etiqueta)
            .OrderByDescending(n => n.IsPinned)
            .ThenBy(n => n.Orden)
            .ThenByDescending(n => n.FechaCreacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return new PagedResponse<Nota>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<PagedResponse<Nota>> GetDeletedByUserAsync(int usuarioId, int page = 1, int pageSize = 50)
    {
        pageSize = Math.Min(pageSize, 100);

        var query = _context.Notas
            .Where(n => n.UsuarioId == usuarioId && n.IsDeleted);

        var total = await query.CountAsync();

        var items = await query
            .Include(n => n.Tareas.OrderBy(t => t.Id))
            .Include(n => n.NotaEtiquetas).ThenInclude(ne => ne.Etiqueta)
            .OrderByDescending(n => n.FechaModificacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return new PagedResponse<Nota>
        {
            Items = items,
            Total = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<Nota?> GetByIdAsync(int id)
    {
        return await _context.Notas
            .Include(n => n.Tareas.OrderBy(t => t.Id))
            .Include(n => n.NotaEtiquetas).ThenInclude(ne => ne.Etiqueta)
            .FirstOrDefaultAsync(n => n.Id == id);
    }

    public async Task<Nota> CreateAsync(Nota nota)
    {
        var maxOrden = await _context.Notas
            .Where(n => n.UsuarioId == nota.UsuarioId && !n.Archivada)
            .MaxAsync(n => (int?)n.Orden) ?? 0;
        nota.Orden = maxOrden + 1;
        _context.Notas.Add(nota);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Created note {NotaId} for user {UsuarioId}", nota.Id, nota.UsuarioId);
        return nota;
    }

    public async Task UpdateAsync(Nota nota)
    {
        await _context.Notas
            .Where(n => n.Id == nota.Id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.Titulo, nota.Titulo)
                .SetProperty(n => n.Contenido, nota.Contenido)
                .SetProperty(n => n.Color, nota.Color)
                .SetProperty(n => n.IsPinned, nota.IsPinned)
                .SetProperty(n => n.Archivada, nota.Archivada)
                .SetProperty(n => n.Recordatorio, nota.Recordatorio)
                .SetProperty(n => n.Orden, nota.Orden)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
    }

    public async Task UpdateColorAsync(int id, string? color)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.Color, color)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
    }

    public async Task TogglePinAsync(int id)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters =>
                setters.SetProperty(n => n.IsPinned, n => !n.IsPinned)
                       .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
    }

    public async Task ArchiveAsync(int id)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.Archivada, true)
                .SetProperty(n => n.FechaArchivado, DateTime.UtcNow)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
        _logger.LogInformation("Archived note {NotaId}", id);
    }

    public async Task RestoreAsync(int id)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.Archivada, false)
                .SetProperty(n => n.FechaArchivado, (DateTime?)null)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
    }

    public async Task UpdateOrderAsync(int id, int orden)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.Orden, orden)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
    }

    public async Task RestoreDeletedAsync(int id)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.IsDeleted, false)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
    }

    public async Task DeleteAsync(int id)
    {
        await _context.Notas
            .Where(n => n.Id == id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(n => n.IsDeleted, true)
                .SetProperty(n => n.FechaModificacion, DateTime.UtcNow));
        _logger.LogInformation("Soft-deleted note {NotaId}", id);
    }
}

using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public class NotaRepository : INotaRepository
{
    private readonly ApplicationDbContext _context;

    public NotaRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Nota>> GetAllByUserAsync(int usuarioId, bool archivadas = false)
    {
        return await _context.Notas
            .Where(n => n.UsuarioId == usuarioId && n.Archivada == archivadas)
            .Include(n => n.Tareas.OrderBy(t => t.Id))
            .Include(n => n.NotaEtiquetas).ThenInclude(ne => ne.Etiqueta)
            .OrderByDescending(n => n.IsPinned)
            .ThenBy(n => n.Orden)
            .ThenByDescending(n => n.FechaCreacion)
            .AsNoTracking()
            .ToListAsync();
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

    public async Task DeleteAsync(Nota nota)
    {
        var tracked = await _context.Notas.FindAsync(nota.Id);
        if (tracked != null) _context.Notas.Remove(tracked);
        await _context.SaveChangesAsync();
    }
}

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

    public async Task<IEnumerable<Nota>> GetAllByUserAsync(int usuarioId)
    {
        return await _context.Notas
            .Where(n => n.UsuarioId == usuarioId)
            .Include(n => n.Tareas)
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.FechaCreacion)
            .ToListAsync();
    }

    public async Task<Nota?> GetByIdAsync(int id)
    {
        return await _context.Notas
            .Include(n => n.Tareas)
            .FirstOrDefaultAsync(n => n.Id == id);
    }

    public async Task<Nota> CreateAsync(Nota nota)
    {
        _context.Notas.Add(nota);
        await _context.SaveChangesAsync();
        return nota;
    }

    public async Task UpdateAsync(Nota nota)
    {
        _context.Notas.Update(nota);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Nota nota)
    {
        _context.Notas.Remove(nota);
        await _context.SaveChangesAsync();
    }
}

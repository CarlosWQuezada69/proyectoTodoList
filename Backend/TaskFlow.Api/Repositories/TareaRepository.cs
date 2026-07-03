using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public class TareaRepository : ITareaRepository
{
    private readonly ApplicationDbContext _context;

    public TareaRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Tarea>> GetAllByNotaAsync(int notaId)
    {
        return await _context.Tareas
            .Where(t => t.NotaId == notaId)
            .ToListAsync();
    }

    public async Task<Tarea?> GetByIdAsync(int id)
    {
        return await _context.Tareas.FindAsync(id);
    }

    public async Task<Tarea> CreateAsync(Tarea tarea)
    {
        _context.Tareas.Add(tarea);
        await _context.SaveChangesAsync();
        return tarea;
    }

    public async Task UpdateAsync(Tarea tarea)
    {
        _context.Tareas.Update(tarea);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Tarea tarea)
    {
        _context.Tareas.Remove(tarea);
        await _context.SaveChangesAsync();
    }
}

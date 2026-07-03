using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public class EtiquetaRepository : IEtiquetaRepository
{
    private readonly ApplicationDbContext _context;

    public EtiquetaRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Etiqueta>> GetAllByUserAsync(int usuarioId)
    {
        return await _context.Etiquetas
            .Where(e => e.UsuarioId == usuarioId)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<Etiqueta> CreateAsync(Etiqueta etiqueta)
    {
        _context.Etiquetas.Add(etiqueta);
        await _context.SaveChangesAsync();
        return etiqueta;
    }

    public async Task DeleteAsync(int id)
    {
        await _context.Etiquetas
            .Where(e => e.Id == id)
            .ExecuteDeleteAsync();
    }

    public async Task AddToNotaAsync(int notaId, int etiquetaId)
    {
        if (!await _context.Set<NotaEtiqueta>().AnyAsync(ne => ne.NotaId == notaId && ne.EtiquetaId == etiquetaId))
        {
            _context.Set<NotaEtiqueta>().Add(new NotaEtiqueta { NotaId = notaId, EtiquetaId = etiquetaId });
            await _context.SaveChangesAsync();
        }
    }

    public async Task RemoveFromNotaAsync(int notaId, int etiquetaId)
    {
        var ne = await _context.Set<NotaEtiqueta>()
            .FirstOrDefaultAsync(x => x.NotaId == notaId && x.EtiquetaId == etiquetaId);
        if (ne != null)
        {
            _context.Set<NotaEtiqueta>().Remove(ne);
            await _context.SaveChangesAsync();
        }
    }
}

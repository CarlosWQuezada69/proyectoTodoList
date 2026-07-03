using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public interface IEtiquetaRepository
{
    Task<IEnumerable<Etiqueta>> GetAllByUserAsync(int usuarioId);
    Task<Etiqueta> CreateAsync(Etiqueta etiqueta);
    Task DeleteAsync(int id);
    Task AddToNotaAsync(int notaId, int etiquetaId);
    Task RemoveFromNotaAsync(int notaId, int etiquetaId);
}

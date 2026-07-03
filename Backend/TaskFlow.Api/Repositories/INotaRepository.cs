using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public interface INotaRepository
{
    Task<IEnumerable<Nota>> GetAllByUserAsync(int usuarioId);
    Task<Nota?> GetByIdAsync(int id);
    Task<Nota> CreateAsync(Nota nota);
    Task UpdateAsync(Nota nota);
    Task DeleteAsync(Nota nota);
}

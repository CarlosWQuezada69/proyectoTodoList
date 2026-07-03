using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public interface INotaRepository
{
    Task<IEnumerable<Nota>> GetAllByUserAsync(int usuarioId);
    Task<Nota?> GetByIdAsync(int id);
    Task<Nota> CreateAsync(Nota nota);
    Task UpdateAsync(Nota nota);
    Task UpdateColorAsync(int id, string? color);
    Task TogglePinAsync(int id);
    Task DeleteAsync(Nota nota);
}

using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public interface INotaRepository
{
    Task<IEnumerable<Nota>> GetAllByUserAsync(int usuarioId, bool archivadas = false);
    Task<Nota?> GetByIdAsync(int id);
    Task<Nota> CreateAsync(Nota nota);
    Task UpdateAsync(Nota nota);
    Task UpdateColorAsync(int id, string? color);
    Task TogglePinAsync(int id);
    Task ArchiveAsync(int id);
    Task RestoreAsync(int id);
    Task UpdateOrderAsync(int id, int orden);
    Task DeleteAsync(Nota nota);
}

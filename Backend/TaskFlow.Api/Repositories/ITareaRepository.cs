using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public interface ITareaRepository
{
    Task<IEnumerable<Tarea>> GetAllByNotaAsync(int notaId);
    Task<Tarea?> GetByIdAsync(int id);
    Task<Tarea> CreateAsync(Tarea tarea);
    Task UpdateAsync(Tarea tarea);
    Task DeleteAsync(Tarea tarea);
}

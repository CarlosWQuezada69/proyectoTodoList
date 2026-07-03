using TaskFlow.Api.Models;

namespace TaskFlow.Api.Repositories;

public interface IUserRepository
{
    Task<Usuario?> GetByIdAsync(int id);
    Task<Usuario?> GetByUsernameAsync(string username);
    Task AddAsync(Usuario usuario);
}

using TaskFlow.Api.Models;

namespace TaskFlow.Api.Services;

public interface IJwtService
{
    string GenerateToken(Usuario usuario);
}

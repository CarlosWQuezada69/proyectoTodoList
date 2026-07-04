using TaskFlow.Api.Models;

namespace TaskFlow.Api.Services;

public interface IJwtService
{
    string GenerateToken(Usuario usuario);
    string GenerateRefreshToken();
    System.Security.Claims.ClaimsPrincipal? ValidateToken(string token);
}

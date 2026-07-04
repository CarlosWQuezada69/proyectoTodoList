using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Data;
using TaskFlow.Api.DTOs;
using TaskFlow.Api.Models;
using TaskFlow.Api.Services;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("Auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtService _jwtService;

    public AuthController(ApplicationDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Usuario y contraseña son requeridos" });

        if (await _context.Usuarios.AnyAsync(u => u.Username == request.Username))
            return BadRequest(new { message = "El usuario ya existe" });

        var usuario = new Usuario
        {
            Username = request.Username,
            PasswordHash = HashPassword(request.Password)
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Cuenta creada exitosamente" });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Usuario y contraseña son requeridos" });

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (usuario == null || !VerifyPassword(request.Password, usuario.PasswordHash))
            return Unauthorized(new { message = "Credenciales inválidas" });

        var refreshToken = _jwtService.GenerateRefreshToken();
        usuario.RefreshToken = refreshToken;
        usuario.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Token = _jwtService.GenerateToken(usuario),
            RefreshToken = refreshToken,
            Username = usuario.Username
        });
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { message = "Refresh token requerido" });

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u =>
            u.RefreshToken == request.RefreshToken &&
            u.RefreshTokenExpires > DateTime.UtcNow);

        if (usuario == null)
            return Unauthorized(new { message = "Sesión expirada" });

        var newRefresh = _jwtService.GenerateRefreshToken();
        usuario.RefreshToken = newRefresh;
        usuario.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Token = _jwtService.GenerateToken(usuario),
            RefreshToken = newRefresh,
            Username = usuario.Username
        });
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            100_000,
            HashAlgorithmName.SHA256,
            32
        );
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var stored = Convert.FromBase64String(parts[1]);
        var computed = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            100_000,
            HashAlgorithmName.SHA256,
            32
        );
        return CryptographicOperations.FixedTimeEquals(stored, computed);
    }
}

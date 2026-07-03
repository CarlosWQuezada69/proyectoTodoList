using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Api.Models;
using TaskFlow.Api.Repositories;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotasController : ControllerBase
{
    private readonly INotaRepository _notaRepo;
    private readonly ITareaRepository _tareaRepo;

    public NotasController(INotaRepository notaRepo, ITareaRepository tareaRepo)
    {
        _notaRepo = notaRepo;
        _tareaRepo = tareaRepo;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Nota>>> GetAll()
    {
        var notas = await _notaRepo.GetAllByUserAsync(UserId);
        return Ok(notas);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Nota>> GetById(int id)
    {
        var nota = await _notaRepo.GetByIdAsync(id);
        if (nota == null || nota.UsuarioId != UserId) return NotFound();
        return Ok(nota);
    }

    [HttpPost]
    public async Task<ActionResult<Nota>> Create([FromBody] Nota nota)
    {
        nota.UsuarioId = UserId;
        nota.FechaCreacion = DateTime.UtcNow;
        var created = await _notaRepo.CreateAsync(nota);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Nota nota)
    {
        if (id != nota.Id) return BadRequest();
        var existing = await _notaRepo.GetByIdAsync(id);
        if (existing == null || existing.UsuarioId != UserId) return NotFound();
        nota.UsuarioId = UserId;
        await _notaRepo.UpdateAsync(nota);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var nota = await _notaRepo.GetByIdAsync(id);
        if (nota == null || nota.UsuarioId != UserId) return NotFound();
        await _notaRepo.DeleteAsync(nota);
        return NoContent();
    }

    [HttpPut("{id}/toggle-pin")]
    public async Task<IActionResult> TogglePin(int id)
    {
        var nota = await _notaRepo.GetByIdAsync(id);
        if (nota == null || nota.UsuarioId != UserId) return NotFound();
        nota.IsPinned = !nota.IsPinned;
        await _notaRepo.UpdateAsync(nota);
        return NoContent();
    }

    [HttpPut("{id}/color")]
    public async Task<IActionResult> UpdateColor(int id, [FromBody] ColorRequest request)
    {
        var nota = await _notaRepo.GetByIdAsync(id);
        if (nota == null || nota.UsuarioId != UserId) return NotFound();
        nota.Color = request.Color;
        await _notaRepo.UpdateAsync(nota);
        return NoContent();
    }
}

public class ColorRequest
{
    public string? Color { get; set; }
}

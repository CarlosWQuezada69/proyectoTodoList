using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TaskFlow.Api.Models;
using TaskFlow.Api.Repositories;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/notas/{notaId}/tareas")]
[Authorize]
public class TareasController : ControllerBase
{
    private readonly ITareaRepository _tareaRepo;
    private readonly INotaRepository _notaRepo;

    public TareasController(ITareaRepository tareaRepo, INotaRepository notaRepo)
    {
        _tareaRepo = tareaRepo;
        _notaRepo = notaRepo;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Tarea>>> GetAll(int notaId)
    {
        if (!await UserOwnsNota(notaId)) return NotFound();
        return Ok(await _tareaRepo.GetAllByNotaAsync(notaId));
    }

    [HttpPost]
    public async Task<ActionResult<Tarea>> Create(int notaId, [FromBody] Tarea tarea)
    {
        if (!await UserOwnsNota(notaId)) return NotFound();
        tarea.NotaId = notaId;
        var created = await _tareaRepo.CreateAsync(tarea);
        return CreatedAtAction(nameof(GetAll), new { notaId }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int notaId, int id, [FromBody] Tarea tarea)
    {
        if (id != tarea.Id) return BadRequest();
        var existing = await _tareaRepo.GetByIdAsync(id);
        if (existing == null || existing.NotaId != notaId) return NotFound();
        if (!await UserOwnsNota(notaId)) return NotFound();
        tarea.NotaId = notaId;
        await _tareaRepo.UpdateAsync(tarea);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int notaId, int id)
    {
        var tarea = await _tareaRepo.GetByIdAsync(id);
        if (tarea == null || tarea.NotaId != notaId) return NotFound();
        if (!await UserOwnsNota(notaId)) return NotFound();
        await _tareaRepo.DeleteAsync(tarea);
        return NoContent();
    }

    [HttpPut("{id}/toggle")]
    public async Task<IActionResult> Toggle(int notaId, int id)
    {
        if (!await UserOwnsNota(notaId)) return NotFound();
        var tarea = await _tareaRepo.GetByIdAsync(id);
        if (tarea == null || tarea.NotaId != notaId) return NotFound();
        await _tareaRepo.ToggleAsync(id);
        return NoContent();
    }

    private async Task<bool> UserOwnsNota(int notaId)
    {
        var nota = await _notaRepo.GetByIdAsync(notaId);
        return nota != null && nota.UsuarioId == UserId;
    }
}

using Microsoft.AspNetCore.Mvc;
using TaskFlow.Api.Models;
using TaskFlow.Api.Repositories;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotasController : ControllerBase
{
    private readonly INotaRepository _notaRepo;

    public NotasController(INotaRepository notaRepo)
    {
        _notaRepo = notaRepo;
    }

    private const int DefaultUserId = 1;

    [HttpGet]
    public async Task<ActionResult<PagedResponse<Nota>>> GetAll(
        [FromQuery] bool archivadas = false,
        [FromQuery] bool eliminadas = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (eliminadas)
            return Ok(await _notaRepo.GetDeletedByUserAsync(DefaultUserId, page, pageSize));
        return Ok(await _notaRepo.GetAllByUserAsync(DefaultUserId, archivadas, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Nota>> GetById(int id)
    {
        var nota = await _notaRepo.GetByIdAsync(id);
        if (nota == null || nota.UsuarioId != DefaultUserId) return NotFound();
        return Ok(nota);
    }

    [HttpPost]
    public async Task<ActionResult<Nota>> Create([FromBody] Nota nota)
    {
        nota.UsuarioId = DefaultUserId;
        nota.FechaCreacion = DateTime.UtcNow;
        var created = await _notaRepo.CreateAsync(nota);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Nota nota)
    {
        if (id != nota.Id) return BadRequest();
        if (!await UserOwnsNota(id)) return NotFound();
        nota.UsuarioId = DefaultUserId;
        await _notaRepo.UpdateAsync(nota);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.DeleteAsync(id);
        return NoContent();
    }

    [HttpPut("{id}/restore-deleted")]
    public async Task<IActionResult> RestoreDeleted(int id)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.RestoreDeletedAsync(id);
        return NoContent();
    }

    [HttpPut("{id}/toggle-pin")]
    public async Task<IActionResult> TogglePin(int id)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.TogglePinAsync(id);
        return NoContent();
    }

    [HttpPut("{id}/color")]
    public async Task<IActionResult> UpdateColor(int id, [FromBody] ColorRequest request)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.UpdateColorAsync(id, request.Color);
        return NoContent();
    }

    [HttpPut("{id}/archive")]
    public async Task<IActionResult> Archive(int id)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.ArchiveAsync(id);
        return NoContent();
    }

    [HttpPut("{id}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.RestoreAsync(id);
        return NoContent();
    }

    [HttpPut("{id}/reorder")]
    public async Task<IActionResult> Reorder(int id, [FromBody] ReorderRequest request)
    {
        if (!await UserOwnsNota(id)) return NotFound();
        await _notaRepo.UpdateOrderAsync(id, request.Orden);
        return NoContent();
    }

    private async Task<bool> UserOwnsNota(int notaId)
    {
        var nota = await _notaRepo.GetByIdAsync(notaId);
        return nota != null && nota.UsuarioId == DefaultUserId;
    }
}

public class ColorRequest
{
    public string? Color { get; set; }
}

public class ReorderRequest
{
    public int Orden { get; set; }
}

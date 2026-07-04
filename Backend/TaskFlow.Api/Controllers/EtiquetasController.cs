using Microsoft.AspNetCore.Mvc;
using TaskFlow.Api.Models;
using TaskFlow.Api.Repositories;

namespace TaskFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EtiquetasController : ControllerBase
{
    private readonly IEtiquetaRepository _repo;
    private readonly INotaRepository _notaRepo;

    public EtiquetasController(IEtiquetaRepository repo, INotaRepository notaRepo)
    {
        _repo = repo;
        _notaRepo = notaRepo;
    }

    private const int DefaultUserId = 1;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Etiqueta>>> GetAll()
    {
        return Ok(await _repo.GetAllByUserAsync(DefaultUserId));
    }

    [HttpPost]
    public async Task<ActionResult<Etiqueta>> Create([FromBody] Etiqueta etiqueta)
    {
        etiqueta.UsuarioId = DefaultUserId;
        var created = await _repo.CreateAsync(etiqueta);
        return CreatedAtAction(nameof(GetAll), null, created);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _repo.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("{etiquetaId}/notas/{notaId}")]
    public async Task<IActionResult> AddToNota(int etiquetaId, int notaId)
    {
        if (!await UserOwnsNota(notaId)) return NotFound();
        await _repo.AddToNotaAsync(notaId, etiquetaId);
        return NoContent();
    }

    [HttpDelete("{etiquetaId}/notas/{notaId}")]
    public async Task<IActionResult> RemoveFromNota(int etiquetaId, int notaId)
    {
        if (!await UserOwnsNota(notaId)) return NotFound();
        await _repo.RemoveFromNotaAsync(notaId, etiquetaId);
        return NoContent();
    }

    private async Task<bool> UserOwnsNota(int notaId)
    {
        var nota = await _notaRepo.GetByIdAsync(notaId);
        return nota != null && nota.UsuarioId == DefaultUserId;
    }
}

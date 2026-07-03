using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace TaskFlow.Api.Models;

public class Nota
{
    [Key]
    public int Id { get; set; }

    [MaxLength(200)]
    public string? Titulo { get; set; }

    [MaxLength(5000)]
    public string? Contenido { get; set; }

    [MaxLength(7)]
    public string? Color { get; set; }

    public bool IsPinned { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public int UsuarioId { get; set; }

    [JsonIgnore, ValidateNever]
    public Usuario Usuario { get; set; } = null!;

    [ValidateNever]
    public ICollection<Tarea> Tareas { get; set; } = new List<Tarea>();
}

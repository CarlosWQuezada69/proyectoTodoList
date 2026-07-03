using System.ComponentModel.DataAnnotations;

namespace TaskFlow.Api.Models;

public class Etiqueta
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(7)]
    public string? Color { get; set; }

    public int UsuarioId { get; set; }
}

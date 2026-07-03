using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace TaskFlow.Api.Models;

public class Tarea
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(500)]
    public string Texto { get; set; } = string.Empty;

    public bool Completada { get; set; }

    public int NotaId { get; set; }

    [JsonIgnore, ValidateNever]
    public Nota Nota { get; set; } = null!;
}

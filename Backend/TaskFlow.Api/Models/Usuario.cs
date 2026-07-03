using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace TaskFlow.Api.Models;

public class Usuario
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Username { get; set; } = null!;

    [Required]
    public string PasswordHash { get; set; } = null!;

    [JsonIgnore, ValidateNever]
    public ICollection<Nota> Notas { get; set; } = new List<Nota>();
}

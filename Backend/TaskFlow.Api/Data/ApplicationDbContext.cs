using Microsoft.EntityFrameworkCore;
using TaskFlow.Api.Models;

namespace TaskFlow.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Nota> Notas { get; set; }
    public DbSet<Tarea> Tareas { get; set; }
    public DbSet<Etiqueta> Etiquetas { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Nota>()
            .HasMany(n => n.Tareas)
            .WithOne(t => t.Nota)
            .HasForeignKey(t => t.NotaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Usuario>()
            .HasMany(u => u.Notas)
            .WithOne(n => n.Usuario)
            .HasForeignKey(n => n.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NotaEtiqueta>(entity =>
        {
            entity.HasKey(ne => new { ne.NotaId, ne.EtiquetaId });
            entity.HasOne(ne => ne.Nota)
                .WithMany(n => n.NotaEtiquetas)
                .HasForeignKey(ne => ne.NotaId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(ne => ne.Etiqueta)
                .WithMany()
                .HasForeignKey(ne => ne.EtiquetaId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

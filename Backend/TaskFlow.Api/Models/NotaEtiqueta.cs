namespace TaskFlow.Api.Models;

public class NotaEtiqueta
{
    public int NotaId { get; set; }
    public int EtiquetaId { get; set; }
    public Nota Nota { get; set; } = null!;
    public Etiqueta Etiqueta { get; set; } = null!;
}

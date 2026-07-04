using System.Reflection;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Serilog;
using TaskFlow.Api.Data;
using TaskFlow.Api.Models;
using TaskFlow.Api.Repositories;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/taskflow-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog();

    // ---- Services ---------------------------------------------------------------
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        });
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath))
        {
            options.IncludeXmlComments(xmlPath);
        }
    });

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<INotaRepository, NotaRepository>();
    builder.Services.AddScoped<ITareaRepository, TareaRepository>();
    builder.Services.AddScoped<IEtiquetaRepository, EtiquetaRepository>();

    // CORS -----------------------------------------------------------------------
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins("http://localhost:8080", "http://localhost:5000")
                  .AllowCredentials()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
    });

    // Rate limiting --------------------------------------------------------------
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.AddFixedWindowLimiter("Auth", auth =>
        {
            auth.PermitLimit = 10;
            auth.Window = TimeSpan.FromMinutes(1);
            auth.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            auth.QueueLimit = 0;
        });

        options.AddFixedWindowLimiter("Api", api =>
        {
            api.PermitLimit = 120;
            api.Window = TimeSpan.FromMinutes(1);
            api.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
            api.QueueLimit = 0;
        });
    });

    // Static files ----------------------------------------------------------------
    builder.Services.AddDirectoryBrowser();

    var app = builder.Build();

    // Security headers -----------------------------------------------------------
    app.Use(async (context, next) =>
    {
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-Frame-Options", "DENY");
        context.Response.Headers.Append("X-XSS-Protection", "0");
        context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.Append("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        await next();
    });

    // Database initialization -----------------------------------------------------
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.EnsureCreated();

        // Ensure default user exists
        if (!db.Usuarios.Any())
        {
            db.Usuarios.Add(new Usuario
            {
                Username = "admin",
                PasswordHash = "default"
            });
            db.SaveChanges();
        }
    }

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.UseHttpsRedirection();
    app.UseCors();
    app.UseRateLimiter();
    app.MapControllers().RequireRateLimiting("Api");
    app.MapFallbackToFile("index.html");

    app.Run();
}
finally
{
    Log.CloseAndFlush();
}

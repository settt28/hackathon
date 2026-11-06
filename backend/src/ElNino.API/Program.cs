using System.Text.Json.Serialization;
using ElNino.Core.Services;
using ElNino.Infrastructure;
using ElNino.Infrastructure.Import;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// --- Servicios ---
builder.Services.AddControllers()
    // Enums como texto en el JSON ("Salud", "Grave"…) en lugar de números
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

// Capa de infraestructura: SQLite (archivo elnino.db junto al proyecto de la API)
var dbPath = Path.Combine(builder.Environment.ContentRootPath,
    builder.Configuration["Database:FileName"] ?? "elnino.db");
var importOptions = builder.Configuration.GetSection("DataImport").Get<DataImportOptions>() ?? new DataImportOptions();
importOptions.BasePath = builder.Environment.ContentRootPath;
builder.Services.AddInfrastructure($"Data Source={dbPath}", importOptions);

// Lógica de dominio (Core)
builder.Services.AddScoped<DistrictService>();
builder.Services.AddScoped<HealthCenterService>();
builder.Services.AddScoped<TipSearchService>();
builder.Services.AddScoped<TriageService>();
builder.Services.AddScoped<ZoneHistoryService>();
builder.Services.AddScoped<PatyService>();
builder.Services.AddScoped<WeatherService>();

// CORS para el frontend de Vite (dev y preview, que se usa para probar la PWA)
const string FrontendCors = "Frontend";
builder.Services.AddCors(o => o.AddPolicy(FrontendCors, p =>
    p.WithOrigins("http://localhost:5173", "http://localhost:4173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Crea la BD y carga los datos semilla si está vacía
await app.Services.InitializeDatabaseAsync();

// --- Pipeline HTTP ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();              // /openapi/v1.json
    app.MapScalarApiReference();   // /scalar → probar los endpoints desde el navegador
}

app.UseHttpsRedirection();
app.UseCors(FrontendCors);
app.UseAuthorization();
app.MapControllers();

app.Run();

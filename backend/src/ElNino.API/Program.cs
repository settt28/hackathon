using System.Text.Json.Serialization;
using ElNino.Core.Services;
using ElNino.Infrastructure;
using ElNino.Infrastructure.Ai;
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
var aiOptions = builder.Configuration.GetSection("Ai").Get<AiOptions>() ?? new AiOptions();
builder.Services.AddInfrastructure($"Data Source={dbPath}", importOptions, aiOptions);

// Modelo XGBoost de riesgo (ml/train_risk_model.py). Solo se usa si reproduce las probabilidades de Python.
var mlDir = importOptions.Resolve(builder.Configuration["Ml:Folder"] ?? "../../data/ml");
string riskModelStatus;
try
{
    var model = XgbModel.Load(Path.Combine(mlDir, "riesgo_xgb.json"), Path.Combine(mlDir, "riesgo_meta.json"));
    var vectors = Path.Combine(mlDir, "riesgo_vectores_prueba.json");
    var diff = File.Exists(vectors) ? model.SelfCheck(vectors) : 0;
    if (diff <= 1e-5)
    {
        builder.Services.AddSingleton(model);
        riskModelStatus = $"Modelo de riesgo XGBoost cargado (autocomprobación OK, diferencia máx. {diff:E1}).";
    }
    else riskModelStatus = $"Modelo de riesgo DESCARTADO: no reproduce a Python (diferencia {diff:E1}). Se usan las reglas.";
}
catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Text.Json.JsonException or NullReferenceException)
{
    riskModelStatus = $"Sin modelo de riesgo ({ex.GetType().Name}: {ex.Message}). Se usan las reglas.";
}

// Lógica de dominio (Core)
builder.Services.AddScoped<DistrictService>();
builder.Services.AddScoped<HealthCenterService>();
builder.Services.AddScoped<TipSearchService>();
builder.Services.AddScoped<TriageService>();
builder.Services.AddScoped<ZoneHistoryService>();
builder.Services.AddScoped<PatyService>();
builder.Services.AddScoped<WeatherService>();
builder.Services.AddScoped<MapService>();
builder.Services.AddScoped<RiskMapService>();
builder.Services.AddScoped<RiskModelService>();

// CORS para el frontend de Vite (dev y preview, que se usa para probar la PWA)
const string FrontendCors = "Frontend";
builder.Services.AddCors(o => o.AddPolicy(FrontendCors, p =>
    p.WithOrigins("http://localhost:5173", "http://localhost:4173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Crea la BD y carga los datos semilla si está vacía
await app.Services.InitializeDatabaseAsync();

app.Logger.LogInformation("{Status}", riskModelStatus);
try { ChannelText.SelfCheck(); }
catch (InvalidOperationException ex) { app.Logger.LogError(ex, "El formato de SMS está roto: {Msg}", ex.Message); }
app.Logger.LogInformation("IA de chat: {Chat} · Dictado: {Stt} · Voz servidor: {Tts}",
    aiOptions.Chat.IsConfigured ? aiOptions.Chat.Model : "no configurada (respuestas por plantilla)",
    aiOptions.Stt.IsConfigured ? aiOptions.Stt.Model : "no",
    aiOptions.Tts.IsConfigured ? "Fish Audio" : "no (el navegador lee en voz alta)");

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

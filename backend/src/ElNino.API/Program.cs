using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using ElNino.API;
using ElNino.Core.Services;
using Microsoft.AspNetCore.ResponseCompression;
using ElNino.Infrastructure;
using ElNino.Infrastructure.Ai;
using ElNino.Infrastructure.Import;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Claves locales (Groq, Fish Audio…) en appsettings.Local.json: git lo ignora, así nunca se suben al repo.
// Ver appsettings.Local.example.json. Las variables de entorno siguen funcionando igual.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: false);

// Ninguna petición necesita más de 1 MB salvo los mensajes de voz (10 MB, ver PatyController.Voz)
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 1_000_000);

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

// CORS: orígenes del frontend en "Cors:Origins" (por defecto, Vite en dev y preview)
const string FrontendCors = "Frontend";
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:5173", "http://localhost:4173"];
builder.Services.AddCors(o => o.AddPolicy(FrontendCors, p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

// Respuestas comprimidas: el GeoJSON del mapa baja ~5-10 veces, clave en redes 2G/3G
builder.Services.AddResponseCompression(o =>
{
    o.EnableForHttps = true; // las respuestas no reflejan secretos, así que no aplica BREACH
    o.Providers.Add<BrotliCompressionProvider>();
    o.Providers.Add<GzipCompressionProvider>();
    o.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/geo+json"]);
});

// Límite de peticiones por IP: protege la cuota de la IA (Groq/Fish Audio cobran por uso) y la base de datos.
// ponytail: detrás de un proxy inverso todas las peticiones llegan con su IP; activar ForwardedHeaders al desplegar así.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = async (ctx, ct) =>
    {
        if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)retry.TotalSeconds).ToString();
        await ctx.HttpContext.Response.WriteAsync("Demasiadas consultas seguidas. Espera un momento e intenta de nuevo.", ct);
    };
    static string Ip(HttpContext c) => c.Connection.RemoteIpAddress?.ToString() ?? "desconocida";
    static RateLimitPartition<string> PerIp(HttpContext c, int perMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(Ip(c), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = perMinute, Window = TimeSpan.FromMinutes(1), QueueLimit = 0,
        });

    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(c => PerIp(c, 300));
    o.AddPolicy(RateLimits.Ai, c => PerIp(c, 20));    // chat, voz, tts: cada consulta puede llamar a un modelo de pago
    o.AddPolicy(RateLimits.Sms, c => PerIp(c, 120));  // el gateway GSM reenvía los SMS de muchas personas desde una IP
    o.AddPolicy(RateLimits.Tts, c => PerIp(c, 90));   // la voz se pide por frases: varias peticiones por respuesta
});

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

// Avisos del SENAMHI precargados y renovados cada 15 min (la caché dura 20): nadie espera los ~4 s de la consulta
_ = Task.Run(async () =>
{
    var senamhi = app.Services.GetRequiredService<ElNino.Core.Interfaces.ISenamhiClient>();
    var stopping = app.Lifetime.ApplicationStopping;
    using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
    try
    {
        do
        {
            try { await senamhi.GetWarningsAsync(stopping); }
            catch (HttpRequestException) { } // sin internet: se reintenta en la próxima vuelta
        } while (await timer.WaitForNextTickAsync(stopping));
    }
    catch (OperationCanceledException) { } // el servidor se está apagando
});

// --- Pipeline HTTP ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();              // /openapi/v1.json
    app.MapScalarApiReference();   // /scalar → probar los endpoints desde el navegador
}

app.UseResponseCompression();

// Cabeceras de seguridad: la API solo devuelve datos, nunca debe mostrarse en un iframe ni interpretarse como otro tipo
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h.XContentTypeOptions = "nosniff";
    h.XFrameOptions = "DENY";
    h["Referrer-Policy"] = "no-referrer";
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        h.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";

        // Lecturas: el navegador puede reusar la respuesta unos segundos y seguir mostrándola mientras
        // pide una nueva por detrás. En 2G/3G eso ahorra varios segundos al volver a una pantalla.
        // Solo en respuestas correctas, y sin pisar un Cache-Control que haya puesto el endpoint.
        if (HttpMethods.IsGet(ctx.Request.Method))
            ctx.Response.OnStarting(static state =>
            {
                var res = (HttpResponse)state;
                if (res.StatusCode == StatusCodes.Status200OK && string.IsNullOrEmpty(res.Headers.CacheControl))
                    res.Headers.CacheControl = "public, max-age=30, stale-while-revalidate=300";
                return Task.CompletedTask;
            }, ctx.Response);
    }
    await next();
});

app.UseHttpsRedirection();
app.UseCors(FrontendCors);
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

app.Run();

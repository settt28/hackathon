using ElNino.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// --- Servicios ---
builder.Services.AddControllers();
builder.Services.AddOpenApi();

// Capa de infraestructura (repositorios, persistencia, servicios externos)
builder.Services.AddInfrastructure();

// CORS para el frontend de Vite en desarrollo
const string FrontendCors = "Frontend";
builder.Services.AddCors(o => o.AddPolicy(FrontendCors, p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// --- Pipeline HTTP ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json
}

app.UseHttpsRedirection();
app.UseCors(FrontendCors);
app.UseAuthorization();
app.MapControllers();

app.Run();

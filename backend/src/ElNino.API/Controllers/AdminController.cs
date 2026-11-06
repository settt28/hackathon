using ElNino.Infrastructure.Import;
using Microsoft.AspNetCore.Mvc;

namespace ElNino.API.Controllers;

/// <summary>
/// Tareas de administración de datos. Requieren la cabecera X-Api-Key (Operador:ApiKey).
/// Ruta base: /api/admin
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AdminController(DataImportService importer, IConfiguration config) : ControllerBase
{
    /// <summary>
    /// Vuelve a importar el historial de eventos (SINPAD del INDECI, desde 2010).
    /// Con ?descargar=true primero baja las versiones más recientes de los portales oficiales.
    /// </summary>
    [HttpPost("importar/historial")]
    public async Task<IActionResult> ImportarHistorial([FromQuery] bool descargar,
        [FromHeader(Name = "X-Api-Key")] string? apiKey, CancellationToken ct)
    {
        if (!Authorized(apiKey)) return Unauthorized("Falta la cabecera X-Api-Key o es incorrecta.");
        try
        {
            return Ok(await importer.ImportHistoryAsync(descargar, ct));
        }
        catch (Exception ex) when (ex is HttpRequestException or IOException or InvalidOperationException)
        {
            return Problem(title: "No se pudo importar el historial", detail: ex.Message, statusCode: 502);
        }
    }

    /// <summary>Vuelve a importar los límites distritales y reasigna el distrito de cada establecimiento de salud.</summary>
    [HttpPost("importar/distritos")]
    public async Task<IActionResult> ImportarDistritos([FromHeader(Name = "X-Api-Key")] string? apiKey, CancellationToken ct)
    {
        if (!Authorized(apiKey)) return Unauthorized("Falta la cabecera X-Api-Key o es incorrecta.");
        try
        {
            return Ok(new { distritos = await importer.ImportDistrictsAsync(ct) });
        }
        catch (Exception ex) when (ex is IOException or InvalidOperationException)
        {
            return Problem(title: "No se pudieron importar los distritos", detail: ex.Message, statusCode: 500);
        }
    }

    private bool Authorized(string? apiKey)
    {
        var expected = config["Operador:ApiKey"];
        return !string.IsNullOrEmpty(expected) && apiKey == expected;
    }
}

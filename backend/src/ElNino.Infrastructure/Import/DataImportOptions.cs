namespace ElNino.Infrastructure.Import;

/// <summary>
/// Rutas y URLs de las fuentes de datos externas. Se configuran en appsettings (sección "DataImport").
/// Las rutas relativas se resuelven desde la carpeta del proyecto de la API.
/// </summary>
public class DataImportOptions
{
    /// <summary>Carpeta base para las rutas relativas (la API pone aquí su ContentRootPath).</summary>
    public string BasePath { get; set; } = AppContext.BaseDirectory;

    /// <summary>Ruta absoluta a partir de una ruta relativa a <see cref="BasePath"/>.</summary>
    public string Resolve(string path) => Path.GetFullPath(Path.IsPathRooted(path) ? path : Path.Combine(BasePath, path));

    /// <summary>Si es true, al arrancar con la BD vacía se importan distritos e historial desde los archivos locales.</summary>
    public bool ImportOnStartup { get; set; } = true;

    /// <summary>Límites distritales del Perú (GeoJSON con IDDIST = ubigeo INEI).</summary>
    public string DistrictsGeoJsonPath { get; set; } = "../../data/peru_distrital_simple.geojson";

    /// <summary>
    /// Zip con los CSV oficiales del INDECI (SINPAD): emergencias por distrito. Se sube a git (pesa ~3 MB).
    /// </summary>
    public string SinpadZipPath { get; set; } = "../../data/sinpad/sinpad_emergencias.zip";

    /// <summary>Archivos del dataset "Emergencias y daños a nivel nacional" (INDECI, Plataforma Nacional de Datos Abiertos).</summary>
    public List<string> SinpadDownloadUrls { get; set; } =
    [
        "https://www.datosabiertos.gob.pe/sites/default/files/BD_2003-2025_EMERGENCIAS.csv",
        "https://www.datosabiertos.gob.pe/sites/default/files/BD_2026_Semestre_I.csv",
    ];

    /// <summary>Solo se importan eventos desde este año (inclusive).</summary>
    public int HistoryMinYear { get; set; } = 2010;
}

using System.Globalization;
using System.Text.Json;
using ElNino.Core.Entities;
using ElNino.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ElNino.Infrastructure.Import;

/// <summary>
/// Importa los límites distritales (GeoJSON) a la tabla districts.
/// Fuente usada: juaneladio/peru-geojson (cartografía INEI, licencia MPL-2.0).
/// Para la versión oficial vigente: IDE del INEI (ide.inei.gob.pe), convertir a GeoJSON en WGS84.
/// </summary>
public class DistrictImporter(AppDbContext db)
{
    private static readonly TextInfo Title = new CultureInfo("es-PE").TextInfo;

    /// <summary>Reemplaza todos los distritos con los del archivo. Devuelve cuántos se cargaron.</summary>
    public async Task<int> ImportAsync(string geoJsonPath, CancellationToken ct = default)
    {
        await using var stream = File.OpenRead(geoJsonPath);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        var list = new List<District>();
        foreach (var f in doc.RootElement.GetProperty("features").EnumerateArray())
        {
            if (!f.TryGetProperty("geometry", out var geom) || geom.ValueKind != JsonValueKind.Object) continue;
            var p = f.GetProperty("properties");
            var ubigeo = Prop(p, "IDDIST");
            if (ubigeo.Length != 6) continue;

            var (minLat, maxLat, minLon, maxLon) = BoundingBox(geom.GetProperty("coordinates"));
            list.Add(new District
            {
                Ubigeo = ubigeo,
                Name = Pretty(Prop(p, "NOMBDIST")),
                Province = Pretty(Prop(p, "NOMBPROV")),
                Department = Pretty(Prop(p, "NOMBDEP")),
                MinLat = minLat, MaxLat = maxLat, MinLon = minLon, MaxLon = maxLon,
                GeoJson = geom.GetRawText(),
            });
        }

        // Un registro por ubigeo (por si el archivo trae duplicados)
        list = list.GroupBy(d => d.Ubigeo).Select(g => g.First()).ToList();

        await db.Districts.ExecuteDeleteAsync(ct);
        db.Districts.AddRange(list);
        await db.SaveChangesAsync(ct);
        db.ChangeTracker.Clear();
        return list.Count;
    }

    private static string Prop(JsonElement p, string name) =>
        p.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()!.Trim() : string.Empty;

    /// <summary>"LURIGANCHO" → "Lurigancho".</summary>
    private static string Pretty(string s) => string.IsNullOrEmpty(s) ? s : Title.ToTitleCase(s.ToLowerInvariant());

    private static (double MinLat, double MaxLat, double MinLon, double MaxLon) BoundingBox(JsonElement coords)
    {
        double minLat = double.MaxValue, maxLat = double.MinValue, minLon = double.MaxValue, maxLon = double.MinValue;

        void Walk(JsonElement el)
        {
            // Un punto es [lon, lat] con números; cualquier otro nivel es un arreglo de arreglos
            if (el.GetArrayLength() >= 2 && el[0].ValueKind == JsonValueKind.Number)
            {
                var lon = el[0].GetDouble();
                var lat = el[1].GetDouble();
                minLat = Math.Min(minLat, lat); maxLat = Math.Max(maxLat, lat);
                minLon = Math.Min(minLon, lon); maxLon = Math.Max(maxLon, lon);
                return;
            }
            foreach (var child in el.EnumerateArray()) Walk(child);
        }

        Walk(coords);
        return (minLat, maxLat, minLon, maxLon);
    }
}

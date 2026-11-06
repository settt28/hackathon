using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Models;

namespace ElNino.Core.Services;

/// <summary>
/// Pronóstico del tiempo y avisos meteorológicos del SENAMHI según dónde está la persona.
/// - Pronóstico: ciudad del SENAMHI más cercana dentro de su departamento.
/// - Avisos: se marca si cada aviso podría afectar su zona (menciona su departamento, o su región natural y zona).
/// </summary>
public class WeatherService(ISenamhiClient senamhi, IRepository<District> districts)
{
    public const string ForecastUrl = "https://www.senamhi.gob.pe/?p=pronostico-meteorologico";

    // Zona (norte/centro/sur) de cada departamento, como la usa el SENAMHI en sus avisos.
    // Ica y Ayacucho aparecen tanto en "centro" como en "sur" según el aviso.
    private static readonly Dictionary<string, string[]> DepartmentZones = new()
    {
        ["tumbes"] = ["norte"], ["piura"] = ["norte"], ["lambayeque"] = ["norte"], ["la libertad"] = ["norte"],
        ["cajamarca"] = ["norte"], ["amazonas"] = ["norte"], ["loreto"] = ["norte"], ["san martin"] = ["norte"],
        ["ancash"] = ["centro", "norte"], ["lima"] = ["centro"], ["callao"] = ["centro"], ["huanuco"] = ["centro"],
        ["pasco"] = ["centro"], ["junin"] = ["centro"], ["huancavelica"] = ["centro"], ["ucayali"] = ["centro"],
        ["ica"] = ["centro", "sur"], ["ayacucho"] = ["centro", "sur"], ["apurimac"] = ["sur"], ["cusco"] = ["sur"],
        ["arequipa"] = ["sur"], ["moquegua"] = ["sur"], ["tacna"] = ["sur"], ["puno"] = ["sur"], ["madre de dios"] = ["sur"],
    };

    /// <summary>Pronóstico para la ubicación (GPS o ubigeo).</summary>
    public async Task<LocalForecast?> GetLocalForecastAsync(District district, double? lat, double? lon, CancellationToken ct = default)
    {
        var dep = TextNormalizer.Normalize(district.Department);
        var slug = dep == "callao" ? "lima" : dep.Replace(' ', '-');   // el SENAMHI publica Callao dentro de Lima
        var cities = await senamhi.GetForecastAsync(slug, ct);
        if (cities.Count == 0) return null;

        var (city, km) = await PickCityAsync(cities, district, lat, lon, ct);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-5));
        var days = city.Days.OrderBy(d => d.Date).ToList();
        // Por la tarde el SENAMHI ya publica desde el día siguiente: entonces el primer día disponible es mañana
        var first = days.FirstOrDefault(d => d.Date == today) ?? days.FirstOrDefault(d => d.Date > today);

        return new LocalForecast(district.Name, district.Department, city.City, km, first, first?.Date == today,
            days.Where(d => d != first && d.Date > today).ToList(), "SENAMHI", $"https://www.senamhi.gob.pe/main.php?dp={slug}&p=pronostico-meteorologico");
    }

    /// <summary>Avisos vigentes y próximos, indicando cuáles podrían afectar la zona de la persona.</summary>
    public async Task<IReadOnlyList<WarningForLocation>> GetWarningsAsync(District? district, bool includeFinished = false, CancellationToken ct = default)
    {
        var warnings = await senamhi.GetWarningsAsync(ct);
        return warnings
            .Where(w => includeFinished || w.Status is "vigente" or "emitido")
            .Select(w => Evaluate(w, district))
            .OrderByDescending(x => x.AffectsYourArea)
            .ThenByDescending(x => LevelRank(x.Warning.Level))
            .ThenBy(x => x.Warning.StartsAt)
            .ToList();
    }

    private static WarningForLocation Evaluate(WeatherWarning w, District? d)
    {
        if (d is null) return new WarningForLocation(w, false, "sin ubicación", "No se envió la ubicación.");

        var text = TextNormalizer.Normalize($"{w.Title} {w.Summary} {string.Join(' ', w.Details)}");
        var dep = TextNormalizer.Normalize(d.Department);
        var prov = TextNormalizer.Normalize(d.Province);

        if (TextNormalizer.ContainsTerm(text, dep) || (prov.Length > 3 && TextNormalizer.ContainsTerm(text, prov)))
            return new WarningForLocation(w, true, "alta", $"El aviso menciona {d.Department}.");

        if (TextNormalizer.ContainsTerm(text, "a nivel nacional") || TextNormalizer.ContainsTerm(text, "todo el pais"))
            return new WarningForLocation(w, true, "media", "El aviso es para todo el país.");

        var region = TextNormalizer.Normalize(d.NaturalRegion);
        if (region.Length > 0 && MentionsRegion(text, region, DepartmentZones.GetValueOrDefault(dep) ?? []))
            return new WarningForLocation(w, true, "media",
                $"El aviso menciona la {region} de tu zona ({d.Department} está en la {region}).");

        return new WarningForLocation(w, false, "baja", "El aviso no menciona tu departamento ni tu región.");
    }

    /// <summary>
    /// ¿El texto menciona la región ("sierra") sin zona, o con la zona del departamento ("sierra sur", "costa centro y sur")?
    /// </summary>
    private static bool MentionsRegion(string text, string region, string[] zones)
    {
        var words = text.Split(' ');
        for (var i = 0; i < words.Length; i++)
        {
            if (words[i] != region) continue;
            // "costa de Lima", "sierra de Arequipa": menciona un lugar concreto (el departamento ya se revisó antes)
            if (i + 2 < words.Length && words[i + 1] is "de" or "del" && words[i + 2] is not ("norte" or "centro" or "sur" or "la" or "el"))
                continue;
            // Zonas que siguen a la región: "costa norte", "costa centro y sur", "sierra norte, centro y sur"
            var listed = new List<string>();
            for (var j = i + 1; j < words.Length && j <= i + 6; j++)
            {
                if (words[j] is "norte" or "centro" or "sur" or "oriental" or "occidental") listed.Add(words[j]);
                else if (words[j] is not ("y" or "e" or "del" or "de" or "la")) break;
            }
            var zoneWords = listed.Where(z => z is "norte" or "centro" or "sur").ToList();
            if (zoneWords.Count == 0 || zoneWords.Any(zones.Contains)) return true;
        }
        return false;
    }

    /// <summary>Ciudad del pronóstico más cercana: se ubica cada ciudad por el distrito del mismo nombre.</summary>
    private async Task<(CityForecast City, double? Km)> PickCityAsync(IReadOnlyList<CityForecast> cities, District user,
        double? lat, double? lon, CancellationToken ct)
    {
        var dep = TextNormalizer.Normalize(user.Department);
        var depDistricts = await districts.ListAsync(d => d.Department == user.Department, ct);

        // 1) La ciudad tiene el mismo nombre que el distrito del usuario
        var same = cities.FirstOrDefault(c => TextNormalizer.Normalize(c.City) == TextNormalizer.Normalize(user.Name));
        if (same is not null) return (same, 0);

        // 2) La más cercana a la ubicación (centro del distrito homónimo de cada ciudad)
        var (uLat, uLon) = lat is double a && lon is double b ? (a, b) : ((user.MinLat + user.MaxLat) / 2, (user.MinLon + user.MaxLon) / 2);
        var located = cities
            .Select(c => (City: c, D: depDistricts.FirstOrDefault(d => TextNormalizer.Normalize(d.Name) == TextNormalizer.Normalize(c.City))))
            .Where(x => x.D is not null)
            .Select(x => (x.City, Km: GeoUtils.HaversineKm(uLat, uLon, (x.D!.MinLat + x.D.MaxLat) / 2, (x.D.MinLon + x.D.MaxLon) / 2)))
            .OrderBy(x => x.Km)
            .FirstOrDefault();
        if (located.City is not null) return (located.City, Math.Round(located.Km, 1));

        // 3) La capital del departamento (ciudad con el mismo nombre) o la primera de la lista
        return (cities.FirstOrDefault(c => TextNormalizer.Normalize(c.City) == dep) ?? cities[0], null);
    }

    private static int LevelRank(string level) => level.ToUpperInvariant() switch
    {
        "ROJO" => 3, "NARANJA" => 2, "AMARILLO" => 1, _ => 0,
    };
}

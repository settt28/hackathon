using System.Globalization;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Models;

namespace ElNino.Core.Services;

/// <summary>
/// Calcula el patrón histórico de peligros de una zona (cuántas veces, cada cuánto, en qué meses)
/// para que Paty pueda advertir: "en tu zona hubo 42 huaicos registrados, sobre todo en febrero y marzo".
/// Es un patrón del pasado, NO una predicción.
/// </summary>
public class ZoneHistoryService(IRepository<HistoricalEvent> events, IRepository<District> districts)
{
    private static readonly CultureInfo Es = new("es-PE");

    public async Task<ZoneRiskSummary> GetSummaryAsync(string ubigeo, DateTime? today = null,
        int maxEvents = 30, CancellationToken ct = default)
    {
        var now = today ?? DateTime.UtcNow;
        var list = (await events.ListAsync(e => e.Ubigeo == ubigeo, ct)).OrderBy(e => e.Date).ToList();

        var district = list.FirstOrDefault()?.District;
        if (string.IsNullOrEmpty(district))
            district = (await districts.ListAsync(d => d.Ubigeo == ubigeo, ct)).FirstOrDefault()?.Name ?? string.Empty;

        var hazards = list
            .GroupBy(e => e.Hazard)
            .Select(g => BuildPattern(g.Key, g.ToList(), district, now))
            .OrderByDescending(p => p.InSeason)
            .ThenByDescending(p => p.Occurrences)
            .ToList();

        var coverage = list.Count == 0
            ? "Sin registros históricos para este distrito. Eso no significa que la zona sea segura."
            : $"{list.Count} eventos registrados entre {list[0].Date.Year} y {list[^1].Date.Year} " +
              $"(fuente: {string.Join(", ", list.Select(e => e.Source.Split(' ')[0]).Distinct())}).";

        // Los eventos más recientes primero, limitados para no enviar cientos al frontend
        var recent = list.OrderByDescending(e => e.Date).Take(Math.Clamp(maxEvents, 0, 500)).ToList();
        return new ZoneRiskSummary(ubigeo, district, coverage, hazards, recent);
    }

    private static HazardPattern BuildPattern(HazardType hazard, List<HistoricalEvent> evs, string district, DateTime now)
    {
        var years = evs.Select(e => e.Date.Year).Distinct().OrderBy(y => y).ToList();

        // Intervalo promedio entre años con eventos (solo si hay al menos 2 años distintos)
        double? interval = years.Count >= 2
            ? Math.Round((double)(years[^1] - years[0]) / (years.Count - 1), 1)
            : null;

        // Meses frecuentes: solo eventos con mes conocido
        var withMonth = evs.Where(e => e.DatePrecision != "anio").ToList();
        var topMonths = withMonth.GroupBy(e => e.Date.Month)
            .OrderByDescending(m => m.Count()).ThenBy(m => m.Key)
            .Take(2).Select(m => m.Key).ToList();

        // "En temporada": estamos en uno de los meses frecuentes o en el mes previo (para prepararse)
        var inSeason = topMonths.Any(m => m == now.Month || m == now.AddMonths(1).Month);
        var monthNames = topMonths.Select(m => Es.DateTimeFormat.GetMonthName(m).ToLowerInvariant()).ToList();

        var warning = BuildWarning(hazard, district, evs.Count, years, interval, monthNames, inSeason);
        return new HazardPattern(hazard, evs.Count, years, interval, monthNames, years[^1], inSeason, warning);
    }

    private static string BuildWarning(HazardType hazard, string district, int count, List<int> years,
        double? interval, List<string> months, bool inSeason)
    {
        var name = HazardName(hazard);
        var where = string.IsNullOrEmpty(district) ? "tu zona" : district;

        if (count == 1)
            return $"En {where} hay 1 registro de {name} ({years[0]}). Que haya pocos registros no significa que la zona sea segura.";

        var yearsText = years.Count <= 6
            ? string.Join(", ", years)
            : $"entre {years[0]} y {years[^1]}, el último en {years[^1]}";
        var text = $"En {where} hay {count} registros de {name} ({yearsText})";
        text += months.Count > 0 ? $", sobre todo en {string.Join(" y ", months)}." : ".";
        if (interval is not null)
            text += $" En promedio, hubo eventos cada {interval.Value.ToString("0.#", Es)} años.";
        if (inSeason)
            text += " Estamos en temporada: prepárate desde ahora.";
        return text + " (Patrón del pasado, no una predicción.)";
    }

    public static string HazardName(HazardType h) => h switch
    {
        HazardType.Huaico => "huaico",
        HazardType.Inundacion => "inundación",
        HazardType.LluviaIntensa => "lluvias intensas",
        HazardType.Deslizamiento => "deslizamiento",
        HazardType.Dengue => "brote de dengue",
        HazardType.Epidemia => "epidemia",
        HazardType.Marejada => "oleaje anómalo",
        _ => "emergencia",
    };
}

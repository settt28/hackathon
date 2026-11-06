using System.Text;
using ElNino.Core.Entities;
using ElNino.Core.Interfaces;
using ElNino.Core.Models;

namespace ElNino.Core.Services;

/// <summary>
/// Cerebro de Paty. Flujo:
/// 1) Triaje por reglas → 2) búsqueda de consejos → 3) historial de la zona →
/// 4) postas cercanas → 5) respuesta (IA si está disponible; si no, plantilla).
/// </summary>
public class PatyService(
    TriageService triage,
    TipSearchService tipSearch,
    ZoneHistoryService zoneHistory,
    HealthCenterService healthCenters,
    DistrictService districts,
    IRepository<Bulletin> bulletins,
    IChatModel chatModel)
{
    // Palabras que indican que la persona busca un establecimiento de salud
    private static readonly string[] CenterWords = ["posta", "hospital", "centro de salud", "clinica", "medico", "doctor", "emergencia"];

    // Palabras que piden información de la zona
    private static readonly string[] ZoneWords = ["mi zona", "zona", "historial", "antes paso", "siempre pasa", "aqui"];

    // Palabras que piden el estado oficial de El Niño (comunicados del ENFEN)
    private static readonly string[] OfficialWords = ["nino", "fenomeno", "enfen", "pronostico", "clima", "senamhi", "comunicado", "boletin"];

    // Palabras asociadas a cada peligro, para elegir qué advertencias históricas mostrar
    private static readonly Dictionary<HazardType, string[]> HazardWords = new()
    {
        [HazardType.Huaico] = ["huaico", "huayco", "quebrada", "lodo", "piedras"],
        [HazardType.Inundacion] = ["inundacion", "inunda", "desborde", "rio", "crecida"],
        [HazardType.LluviaIntensa] = ["lluvia", "llueve", "lluvias", "aguacero"],
        [HazardType.Deslizamiento] = ["deslizamiento", "derrumbe", "cerro"],
        [HazardType.Dengue] = ["dengue", "zancudo", "mosquito"],
    };

    public async Task<PatyReply> ChatAsync(PatyRequest req, CancellationToken ct = default)
    {
        var text = TextNormalizer.Normalize(req.Message);

        // 0) ¿Dónde está la persona? El ubigeo enviado manda; si no, se deduce del GPS.
        DistrictLocation? location = null;
        var ubigeo = string.IsNullOrWhiteSpace(req.Ubigeo) ? null : req.Ubigeo.Trim();
        if (ubigeo is not null)
        {
            var d = await districts.GetByUbigeoAsync(ubigeo, ct);
            if (d is not null) location = new DistrictLocation(d.Ubigeo, d.Name, d.Province, d.Department, true, null);
        }
        else if (req.Latitude is double gLat && req.Longitude is double gLon)
        {
            location = await districts.LocateAsync(gLat, gLon, ct);
            ubigeo = location?.Ubigeo;
        }

        // 1) Triaje
        var tri = await triage.EvaluateAsync(req.Message, ct);

        // 2) Consejos (si no hay en el sector elegido, se busca en todos)
        var tips = await tipSearch.SearchAsync(req.Message, req.Domain, 3, ct);
        if (tips.Count == 0 && req.Domain is not null)
            tips = await tipSearch.SearchAsync(req.Message, null, 3, ct);

        // 3) Historial de la zona
        var zoneWarnings = new List<string>();
        if (ubigeo is not null)
        {
            var summary = await zoneHistory.GetSummaryAsync(ubigeo, maxEvents: 0, ct: ct);
            var asksZone = ZoneWords.Any(w => TextNormalizer.ContainsTerm(text, w));
            var mentioned = HazardWords
                .Where(kv => kv.Value.Any(w => TextNormalizer.ContainsTerm(text, w)))
                .Select(kv => kv.Key)
                .Concat(tips.Take(1).Select(t => t.Hazard))   // solo el consejo principal, para no meter ruido
                .ToHashSet();

            zoneWarnings.AddRange(summary.Hazards
                .Where(h => asksZone || mentioned.Contains(h.Hazard))
                .Take(3)                                   // las 3 más relevantes (en temporada y más frecuentes)
                .Select(h => h.Warning));
            if (asksZone && summary.Hazards.Count == 0)
                zoneWarnings.Add(summary.Coverage);
        }

        // 3b) Boletín oficial vigente del ENFEN (estado de El Niño), si la persona pregunta por El Niño o por su zona
        var notices = new List<string>();
        if (OfficialWords.Any(w => TextNormalizer.ContainsTerm(text, w)) || ZoneWords.Any(w => TextNormalizer.ContainsTerm(text, w)))
        {
            var latest = (await bulletins.ListAsync(b => b.Institution == "ENFEN", ct))
                .OrderByDescending(b => b.PublishedAt).FirstOrDefault();
            if (latest is not null)
                notices.Add($"Según el {latest.Title} ({latest.PublishedAt:dd/MM/yyyy}): {latest.AlertStatus}. {latest.Summary}");
        }

        // 4) Postas cercanas (si hay ubicación y la situación lo amerita o la persona lo pide)
        var wantsCenter = CenterWords.Any(w => TextNormalizer.ContainsTerm(text, w));
        IReadOnlyList<NearbyHealthCenter> nearest = [];
        if (req.Latitude is double lat && req.Longitude is double lon &&
            (wantsCenter || (tri.Level != TriageLevel.Leve && tri.EmergencyType == EmergencyType.Medica)))
        {
            nearest = await healthCenters.GetNearestAsync(lat, lon, 3,
                emergencyOnly: tri.Level == TriageLevel.Grave, ct);
        }

        var actions = BuildActions(tri, wantsCenter, nearest);

        // 5) Respuesta: primero intenta la IA; si no hay IA o falla, usa la plantilla
        string? aiText = null;
        try
        {
            aiText = await chatModel.GenerateAsync(BuildSystemPrompt(tri, tips, zoneWarnings, notices), req.Message, ct);
        }
        catch (Exception) when (!ct.IsCancellationRequested)
        {
            aiText = null; // la IA nunca debe tumbar el chat
        }

        var reply = string.IsNullOrWhiteSpace(aiText)
            ? BuildTemplateReply(tri, tips, zoneWarnings, notices, nearest, wantsCenter)
            : aiText.Trim();

        // En emergencia grave, el aviso de llamar va siempre primero, aunque responda la IA
        if (tri.Level == TriageLevel.Grave && !string.IsNullOrWhiteSpace(aiText))
            reply = $"⚠️ Esto puede ser una emergencia. Llama al {tri.PhoneNumber} ({tri.PhoneLabel}) ahora.\n\n{reply}";

        var tipRefs = tips.Select(t => new TipReference(t.Id, t.Title, t.Domain, t.Source, t.Steps,
            t.SourceDocument, t.SourceUrl, t.SourceDate)).ToList();
        return new PatyReply(reply, location, tri, tipRefs, zoneWarnings, notices, nearest, actions, UsedAi: !string.IsNullOrWhiteSpace(aiText));
    }

    private static List<PatyAction> BuildActions(TriageResult tri, bool wantsCenter, IReadOnlyList<NearbyHealthCenter> nearest)
    {
        var actions = new List<PatyAction>();
        if (tri.Level == TriageLevel.Grave)
        {
            actions.Add(new PatyAction("llamar", $"Llamar al {tri.PhoneNumber} ({tri.PhoneLabel})", tri.PhoneNumber));
            if (tri.EmergencyType == EmergencyType.Desastre)
            {
                actions.Add(new PatyAction("llamar", $"Llamar al {TriageService.DefensaCivilNumber} (Defensa Civil)", TriageService.DefensaCivilNumber));
                actions.Add(new PatyAction("ver_zona_segura", "Ver zona segura"));
            }
        }
        if (nearest.Count > 0 || wantsCenter || (tri.Level != TriageLevel.Leve && tri.EmergencyType == EmergencyType.Medica))
            actions.Add(new PatyAction("ver_centros", "Ver centro de salud más cercano"));
        return actions;
    }

    private static string BuildTemplateReply(TriageResult tri, IReadOnlyList<PreventionTip> tips,
        List<string> zoneWarnings, List<string> notices, IReadOnlyList<NearbyHealthCenter> nearest, bool wantsCenter)
    {
        var sb = new StringBuilder();

        if (tri.Level == TriageLevel.Grave)
        {
            sb.AppendLine($"⚠️ Esto puede ser una emergencia. Llama al {tri.PhoneNumber} ({tri.PhoneLabel}) ahora.");
            if (nearest.Count > 0)
            {
                var n = nearest[0];
                sb.AppendLine($"El establecimiento con emergencias más cercano es {n.Center.Name}, a {n.DistanceKm:0.#} km.");
            }
            if (tips.Count > 0) sb.AppendLine().AppendLine("Mientras llega la ayuda:");
        }
        else if (wantsCenter && nearest.Count > 0)
        {
            var n = nearest[0];
            sb.AppendLine($"El establecimiento de salud más cercano es {n.Center.Name}, a {n.DistanceKm:0.#} km " +
                          $"(unos {n.WalkingMinutes} minutos caminando).");
        }

        if (tips.Count > 0)
        {
            var main = tips[0];
            if (tri.Level != TriageLevel.Grave) sb.AppendLine($"{main.Title}:");
            for (var i = 0; i < main.Steps.Count && i < 5; i++)
                sb.AppendLine($"{i + 1}. {main.Steps[i]}");
            sb.AppendLine($"(Fuente: {main.Source})");

            var others = tips.Skip(1).Select(t => $"{t.Title} ({t.Source})").ToList();
            if (others.Count > 0)
                sb.AppendLine().AppendLine($"También te puede servir: {string.Join("; ", others)}.");
        }

        if (tri.Level == TriageLevel.Moderado && tri.EmergencyType == EmergencyType.Medica)
            sb.AppendLine().AppendLine("Si los síntomas continúan o empeoran, acude a tu centro de salud.");

        foreach (var w in zoneWarnings)
            sb.AppendLine().AppendLine($"📍 {w}");

        foreach (var n in notices)
            sb.AppendLine().AppendLine($"📢 {n}");

        if (sb.Length == 0)
            sb.Append("No tengo esa información todavía. Puedes preguntarme sobre tu salud, tu chacra o tu casa. " +
                      "Si es urgente, acércate a tu centro de salud.");

        return sb.ToString().Trim();
    }

    /// <summary>System prompt para cuando se conecte un modelo de IA (Gemma, Gemini…).</summary>
    public static string BuildSystemPrompt(TriageResult tri, IReadOnlyList<PreventionTip> tips,
        IReadOnlyList<string> zoneWarnings, IReadOnlyList<string> notices)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Eres Paty, asistente de prevención ante el Fenómeno El Niño en Perú.");
        sb.AppendLine("Respondes en español simple, frases cortas, máximo 5 pasos numerados.");
        sb.AppendLine("Usa SOLO la información de los FRAGMENTOS y del HISTORIAL. Si no está ahí, di:");
        sb.AppendLine("\"No tengo esa información, acércate a tu centro de salud o municipalidad\".");
        sb.AppendLine("No diagnostiques ni recetes medicamentos. Cita la fuente al final.");
        sb.AppendLine("Si el HISTORIAL muestra eventos relacionados, advierte mencionando años y meses.");
        sb.AppendLine("NUNCA digas que un evento ocurrirá en una fecha exacta: es un patrón del pasado.");
        sb.AppendLine($"Nivel de gravedad detectado: {tri.Level}.");
        sb.AppendLine();
        sb.AppendLine("FRAGMENTOS:");
        foreach (var t in tips)
            sb.AppendLine($"- [{t.Source} – {t.SourceDocument}] {t.Title}: {string.Join(" / ", t.Steps)}");
        if (zoneWarnings.Count > 0)
        {
            sb.AppendLine().AppendLine("HISTORIAL DE LA ZONA:");
            foreach (var w in zoneWarnings) sb.AppendLine($"- {w}");
        }
        if (notices.Count > 0)
        {
            sb.AppendLine().AppendLine("BOLETINES OFICIALES VIGENTES:");
            foreach (var n in notices) sb.AppendLine($"- {n}");
        }
        return sb.ToString();
    }
}

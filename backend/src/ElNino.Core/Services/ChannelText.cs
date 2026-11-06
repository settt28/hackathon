using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ElNino.Core.Entities;
using ElNino.Core.Models;

namespace ElNino.Core.Services;

/// <summary>Adapta la respuesta de Paty a canales sin pantalla: SMS (2G) y voz.</summary>
public static partial class ChannelText
{
    public const int SmsMax = 160;

    /// <summary>
    /// Respuesta en UN solo SMS: 160 caracteres del alfabeto GSM de 7 bits. Un solo carácter fuera de él
    /// (tilde, emoji) haría que el mensaje se cobre como 70 caracteres por parte. Grave → número a llamar primero.
    /// </summary>
    public static string Sms(PatyReply r)
    {
        var parts = new List<string>();
        if (r.Triage.Level == TriageLevel.Grave)
            parts.Add($"EMERGENCIA: llama YA al {r.Triage.PhoneNumber} ({r.Triage.PhoneLabel}).");

        if (r.Tips.Count > 0)
        {
            var tip = r.Tips[0];
            if (r.Triage.Level != TriageLevel.Grave) parts.Add($"{tip.Title}:");
            parts.AddRange(tip.Steps.Select((s, i) => $"{i + 1}) {s}"));
        }
        else if (r.Triage.Level != TriageLevel.Grave)
            parts.Add(FirstSentence(Speakable(r.Reply)));

        // Se agregan frases completas mientras quepan; si la primera no cabe, se corta en una palabra
        var sb = new StringBuilder();
        foreach (var p in parts.Select(Gsm).Where(p => p.Length > 0))
        {
            var add = sb.Length == 0 ? p : " " + p;
            if (sb.Length + add.Length <= SmsMax) sb.Append(add);
            else
            {
                if (sb.Length == 0) sb.Append(Cut(p, SmsMax));
                break;
            }
        }
        return sb.ToString();
    }

    /// <summary>Texto para leer en voz alta: sin emojis, sin enlaces y con un largo razonable.</summary>
    public static string Speakable(string text)
    {
        var t = Url().Replace(text, "");
        t = new string(t.Where(c => !char.IsSurrogate(c) && CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.OtherSymbol).ToArray());
        t = Spaces().Replace(t.Replace("\r", ""), " ").Trim();
        return t.Length > 900 ? Cut(t, 900) : t;
    }

    // Caracteres del alfabeto GSM 7 bits que se usan en español además de ASCII
    private const string GsmExtra = "ñÑ¿¡éÉüÜ";

    private static string Gsm(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s.Normalize(NormalizationForm.FormC))
        {
            if (ch < 128 || GsmExtra.Contains(ch)) { sb.Append(ch); continue; }
            if (char.IsSurrogate(ch)) continue; // mitad de un emoji: no se puede normalizar
            var baseChar = ch.ToString().Normalize(NormalizationForm.FormD)[0]; // á → a
            if (baseChar < 128 && char.IsLetter(baseChar)) sb.Append(baseChar);
            else if (ch is '–' or '—') sb.Append('-');
            else if (ch is '“' or '”') sb.Append('"');
            // emojis y demás símbolos se descartan
        }
        return Spaces().Replace(sb.ToString(), " ").Trim();
    }

    private static string Cut(string s, int max)
    {
        if (s.Length <= max) return s;
        var cut = s[..(max - 3)];
        var space = cut.LastIndexOf(' ');
        return (space > max / 2 ? cut[..space] : cut).TrimEnd(',', ';', ':') + "...";
    }

    private static string FirstSentence(string s)
    {
        var i = s.IndexOf(". ", StringComparison.Ordinal);
        return i > 0 ? s[..(i + 1)] : s;
    }

    /// <summary>Autocomprobación: los mensajes caben en un SMS y solo usan el alfabeto GSM. Lanza si algo se rompe.</summary>
    public static void SelfCheck()
    {
        TipReference Tip(params string[] steps) =>
            new(Guid.Empty, "Prepárate ante un huaico", AlertDomain.Infraestructura, "INDECI", steps, "", "", null);
        var grave = new TriageResult(TriageLevel.Grave, EmergencyType.Desastre, "116", "Bomberos", ["huaico"]);
        var leve = new TriageResult(TriageLevel.Leve, null, null, null, []);
        PatyReply Reply(TriageResult t, string text, params TipReference[] tips) => new(text, null, t, tips, [], [], [], [], false);

        var long1 = new string('x', 60) + " paso con acción rápida ⚠️ 🌧️ y tildes áéíóú";
        foreach (var msg in new[]
                 {
                     Sms(Reply(grave, "", Tip(long1, long1, long1))),
                     Sms(Reply(leve, "", Tip(long1, long1))),
                     Sms(Reply(leve, "⚠️ Hola. Sin consejos para esto.")),
                     Sms(Reply(leve, new string('a', 400))),
                 })
        {
            if (msg.Length is 0 or > SmsMax) throw new InvalidOperationException($"SMS de {msg.Length} caracteres: {msg}");
            if (msg.Any(c => c >= 128 && !GsmExtra.Contains(c))) throw new InvalidOperationException($"SMS fuera de GSM-7: {msg}");
        }
        if (!Sms(Reply(grave, "", Tip("Sube a una zona alta"))).StartsWith("EMERGENCIA: llama YA al 116"))
            throw new InvalidOperationException("En emergencia el SMS debe empezar con el número a llamar.");
    }

    [GeneratedRegex(@"https?://\S+")]
    private static partial Regex Url();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();
}

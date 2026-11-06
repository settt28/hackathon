import type { NearbyHealthCenter, PatyAction, PatyReply, TipReference, TriageLevel } from '../api'

/**
 * Paty sin conexión: la misma lógica del backend (ElNino.Core/Services: TriageService, TipSearchService,
 * HealthCenterService, DistrictService y las plantillas de PatyService), sin red ni LLM.
 * Si cambian las reglas allí, deben cambiar aquí. Los datos los genera el backend (ver OfflineExport.cs).
 * Sin dependencias del navegador: recibe los datos como parámetros.
 */

export type Coords = { latitude: number; longitude: number }
type EmergencyType = 'Medica' | 'Desastre'

export interface OfflineTip {
  id: string
  hazard: string
  phase: 'Antes' | 'Durante' | 'Despues'
  topic: string
  title: string
  steps: string[]
  keywords: string[]
  source: string
  sourceUrl: string
}

export interface OfflineKnowledge {
  generatedAt: string
  keywords: { term: string; level: TriageLevel; emergencyType: EmergencyType }[]
  tips: OfflineTip[]
  enfen: { title: string; publishedAt: string; alertStatus: string; summary: string } | null
}

type Ring = [number, number][]
type Geometry = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] }

export interface OfflineDistrict {
  u: string // ubigeo
  n: string // distrito
  p: string // provincia
  d: string // departamento
  b: [minLat: number, maxLat: number, minLon: number, maxLon: number]
  r: string // nivel de riesgo por mes (enero = posición 0), "-" si no hay dato
  pr: number[] // probabilidad en % por mes, -1 si no hay dato
  h: string | null // peligro principal
  hn: string | null // su nombre en español
  g: Geometry
}

export type OfflineCenter = [name: string, type: string, emergencies: 0 | 1, latitude: number, longitude: number, phone: string | null]

/** Datos pesados, que se cargan aparte. Sin ellos Paty responde igual, pero sin distrito ni postas. */
export interface OfflineGeo {
  districts: OfflineDistrict[]
  centers: OfflineCenter[]
}

// ---- Texto (TextNormalizer.cs) ----

const STOP_WORDS = new Set([
  'una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'que', 'con', 'por', 'para', 'hay', 'mis', 'tus', 'sus',
  'como', 'donde', 'cual', 'cuando', 'esta', 'este', 'esto', 'estan', 'muy', 'mas', 'pero', 'sin', 'sobre',
  'tengo', 'tiene', 'hago', 'hacer', 'puedo', 'debo', 'quiero', 'algo', 'ante', 'entre', 'hasta', 'desde',
])

export function normalize(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, ' ')
    .split(' ')
    .filter(Boolean)
    .join(' ')
}

const words = (text: string) => normalize(text).split(' ').filter((w) => w.length > 2 && !STOP_WORDS.has(w))

const containsTerm = (text: string, term: string) =>
  ` ${text} `.includes(` ${term} `) || (term.length >= 5 && text.includes(term))

const hasAny = (text: string, terms: readonly string[]) => terms.some((t) => containsTerm(text, t))

// ---- Triaje (TriageService.cs) ----

const LEVELS: TriageLevel[] = ['Leve', 'Moderado', 'Grave']
const NEGATIONS = ['ya no', 'no tengo', 'no tiene', 'no hay', 'sin']
const CRISIS_TERMS = ['matarme', 'suicid', 'quitarme la vida', 'no quiero vivir', 'hacerme dano']
const QUESTION_STARTS = ['como ', 'cual ', 'que es ', 'que hacer', 'que debo hacer', 'que hago si', 'que pasa si', 'si hay', 'para prevenir']
const CONTEXT_WORDS = ['prevenir', 'evitar', 'evito', 'hubo', 'ayer', 'hace anos', 'ano pasado', 'siempre', 'donar', 'analisis de', 'pelicula', 'simulacro']
const URGENT_WORDS = ['ahora', 'ayuda', 'ayudo', 'auxilio', 'urgente', 'rapido']

/** Crisis de salud mental: nunca se rebaja y recibe la línea especializada. */
const isCrisis = (text: string) => hasAny(text, CRISIS_TERMS)

/** Pregunta, hipótesis o hecho pasado: no es una emergencia en curso, salvo que pida ayuda urgente. */
const isInformative = (text: string) =>
  !hasAny(text, URGENT_WORDS) && (QUESTION_STARTS.some((s) => text.startsWith(s)) || hasAny(text, CONTEXT_WORDS))

export function triage(message: string, knowledge: OfflineKnowledge): PatyReply['triage'] {
  const text = normalize(message)
  // "ya no sangra" o "no tengo fiebre" no cuentan como señal
  const matches = knowledge.keywords.filter((k) => {
    const term = normalize(k.term)
    return containsTerm(text, term) && !NEGATIONS.some((n) => text.includes(`${n} ${term}`))
  })
  if (matches.length === 0) return { level: 'Leve', emergencyType: null, phoneNumber: null, phoneLabel: null }

  const level = LEVELS[Math.max(...matches.map((m) => LEVELS.indexOf(m.level)))]
  const top = matches.filter((m) => m.level === level)
  // Si hay señales médicas y de desastre al mismo nivel, prima la médica (la vida de la persona)
  const emergencyType: EmergencyType = top.some((m) => m.emergencyType === 'Medica') ? 'Medica' : 'Desastre'
  if (level !== 'Grave') return { level, emergencyType, phoneNumber: null, phoneLabel: null }
  // Si no es una emergencia en curso baja a Moderado (sin cuenta regresiva), pero conserva el número para llamar
  const finalLevel = isInformative(text) && !isCrisis(text) ? 'Moderado' : level
  return emergencyType === 'Medica'
    ? { level: finalLevel, emergencyType, phoneNumber: '106', phoneLabel: 'SAMU – ambulancia' }
    : { level: finalLevel, emergencyType, phoneNumber: '116', phoneLabel: 'Bomberos' }
}

// ---- Consejos (TipSearchService.cs) ----

const PHASES = ['Antes', 'Durante', 'Despues'] as const
const AFTER_WORDS = ['despues', 'paso', 'regresar', 'volver', 'limpiar', 'ya paso']
const DURING_WORDS = ['viene', 'ahora', 'entrando', 'durante', 'esta pasando', 'tengo', 'tiene']

function sameStem(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  if (a.startsWith(b) || b.startsWith(a)) return true
  let common = 0
  while (common < a.length && common < b.length && a[common] === b[common]) common++
  return common >= 5
}

function scoreTip(tip: OfflineTip, queryWords: string[]): number {
  const keywords = tip.keywords.map(normalize)
  const titleWords = words(`${tip.title} ${tip.topic}`)
  let score = 0
  for (const w of queryWords) {
    // La palabra exacta pesa más: "agua" debe traer el consejo de agua, no el que menciona "agua estancada"
    if (keywords.includes(w)) score += 5
    else if (keywords.some((k) => sameStem(k, w))) score += 3
    if (titleWords.some((t) => sameStem(t, w))) score += 1
  }
  return score
}

export function searchTips(text: string, knowledge: OfflineKnowledge, take: number): OfflineTip[] {
  // "El Niño" (el fenómeno) no debe confundirse con "niño" (un menor)
  const queryWords = words(normalize(text).replaceAll('el nino', 'elnino'))
  if (queryWords.length === 0) return []
  const normalized = normalize(text)
  const phase = hasAny(normalized, AFTER_WORDS) ? 'Despues' : hasAny(normalized, DURING_WORDS) ? 'Durante' : 'Antes'
  return knowledge.tips
    .map((tip) => ({ tip, score: scoreTip(tip, queryWords) }))
    .filter((x) => x.score > 0)
    .map((x) => ({ tip: x.tip, score: x.score + (x.tip.phase === phase ? 2 : 0) }))
    .sort((a, b) => b.score - a.score || PHASES.indexOf(a.tip.phase) - PHASES.indexOf(b.tip.phase))
    .slice(0, take)
    .map((x) => x.tip)
}

// ---- Geografía (GeoUtils.cs, DistrictService.cs, HealthCenterService.cs) ----

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function ringContains(ring: Ring, lat: number, lon: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const polygonContains = (rings: Ring[], lat: number, lon: number) =>
  rings.length > 0 && ringContains(rings[0], lat, lon) && !rings.slice(1).some((hole) => ringContains(hole, lat, lon))

const geometryContains = (g: Geometry, lat: number, lon: number) =>
  g.type === 'Polygon' ? polygonContains(g.coordinates, lat, lon) : g.coordinates.some((p) => polygonContains(p, lat, lon))

export function locate(districts: OfflineDistrict[], lat: number, lon: number): OfflineDistrict | null {
  const exact = districts.find(
    (d) => d.b[0] <= lat && d.b[1] >= lat && d.b[2] <= lon && d.b[3] >= lon && geometryContains(d.g, lat, lon),
  )
  if (exact) return exact

  // El punto cayó en un hueco del mapa (costa, límites): el distrito cercano cuyo centro esté más próximo
  const box = 0.15
  let best: OfflineDistrict | null = null
  let bestKm = Infinity
  for (const d of districts) {
    if (d.b[0] > lat + box || d.b[1] < lat - box || d.b[2] > lon + box || d.b[3] < lon - box) continue
    const km = haversineKm(lat, lon, (d.b[0] + d.b[1]) / 2, (d.b[2] + d.b[3]) / 2)
    if (km < bestKm) {
      best = d
      bestKm = km
    }
  }
  return best
}

export function nearestCenters(centers: OfflineCenter[], lat: number, lon: number, take: number, emergencyOnly: boolean): NearbyHealthCenter[] {
  const pool = emergencyOnly ? centers.filter((c) => c[2] === 1) : centers
  // Se amplía el radio (~22, ~55 y ~165 km) hasta encontrar alguno; como último recurso, todo el catálogo
  const inBox = (d: number) => pool.filter((c) => Math.abs(c[3] - lat) < d && Math.abs(c[4] - lon) < d)
  const candidates = [0.2, 0.5, 1.5].map(inBox).find((list) => list.length > 0) ?? pool
  return candidates
    .map((c) => ({ c, km: Math.round(haversineKm(lat, lon, c[3], c[4]) * 100) / 100 }))
    .sort((a, b) => a.km - b.km)
    .slice(0, take)
    .map(({ c, km }) => ({
      center: { name: c[0], type: c[1], latitude: c[3], longitude: c[4], phone: c[5] },
      distanceKm: km,
      walkingMinutes: Math.ceil((km / 5) * 60),
    }))
}

// ---- Conversación: memoria corta para no repetirse y entender "¿qué más?" / "sí" ----

/**
 * Lo que Paty recuerda de la conversación en curso (sin conexión no hay un modelo de lenguaje que lo haga).
 * Sirve para no repetir frases ni pasos, continuar donde quedó y responder a "sí" cuando ofreció algo.
 * No guarda nada fuera de la memoria: al salir del chat se empieza de cero.
 */
export interface OfflineSession {
  turn: number
  /** Cuántos pasos de cada consejo ya se contaron (por id). */
  shown: Record<string, number>
  /** Consejos de la última respuesta: a ellos se refiere un "¿qué más?". */
  lastTips: string[]
  /** Lo que Paty ofreció al final ("¿quieres que te cuente…?"): un "sí" lo cumple. */
  offer: { tipId: string } | null
  greeted: boolean
  /** Ya se habló del riesgo de su distrito: no se repite en cada respuesta. */
  zoneTold: boolean
  /** Frases usadas hace poco, para variar. */
  recent: string[]
  /** Hora local (0-23), para saludar "buenos días / tardes / noches". */
  hour?: number
}

export const newOfflineSession = (hour?: number): OfflineSession => ({
  turn: 0, shown: {}, lastTips: [], offer: null, greeted: false, zoneTold: false, recent: [], hour,
})

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

/** Elige una variante que no se haya usado hace poco. Determinista (mismo mensaje y turno → misma frase): testeable. */
function pick(session: OfflineSession, options: readonly string[], seed: string): string {
  const fresh = options.filter((o) => !session.recent.includes(o))
  const pool = fresh.length > 0 ? fresh : options
  const choice = pool[(hash(seed) + session.turn) % pool.length]
  session.recent = [choice, ...session.recent].slice(0, 16)
  return choice
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s)
const withPeriod = (s: string) => (/[.!?:]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`)

/** Cómo nombrar cada tema dentro de una frase ("Sobre el dengue, …"). Sin entrada: el título del consejo. */
const TOPIC_PHRASES: Record<string, string> = {
  dengue: 'el dengue',
  'agua segura': 'el agua segura',
  'mochila de emergencia': 'tu mochila de emergencia',
  cultivos: 'tu chacra',
  plagas: 'las plagas en tus cultivos',
  ganado: 'la salud de tus animales',
  techo: 'tu techo y la alerta del barrio',
  vivienda: 'preparar tu casa',
  evacuacion: 'qué hacer si viene un huaico o una inundación',
  despues: 'lo que toca hacer después del huaico o la inundación',
  leptospirosis: 'la leptospirosis',
  'diarrea en ninos': 'las diarreas en los niños',
  'infecciones respiratorias': 'las infecciones respiratorias',
  'golpe de calor': 'el calor intenso',
  alertas: 'las alertas oficiales en tu celular',
  pesca: 'el oleaje y la pesca',
}
const topicOf = (t: OfflineTip) => TOPIC_PHRASES[normalize(t.topic)] ?? lowerFirst(t.title)

// Primera frase: responde directo con el paso más importante. {t} = tema, {s} = paso.
const OPENERS: Record<OfflineTip['phase'], readonly string[]> = {
  Antes: [
    'Sobre {t}, lo más importante es esto: {s}',
    'Te cuento lo esencial sobre {t}. Lo primero: {s}',
    'Con {t}, lo que más ayuda es adelantarse. Empieza por aquí: {s}',
    'Buena pregunta. En cuanto a {t}, lo primero es: {s}',
  ],
  Durante: [
    'Sobre {t}, lo que debes hacer ahora es esto: {s}',
    'Con {t}, en este momento lo más importante es: {s}',
    'Te ayudo con {t}. Haz esto primero: {s}',
  ],
  Despues: [
    'Sobre {t}, cuando ya pasó lo peor, lo primero es: {s}',
    'Con {t}, después de la emergencia lo más importante es: {s}',
    'Te ayudo con {t}. Para después, empieza por aquí: {s}',
  ],
}
const ALSO = ['Además:', 'También te ayuda:', 'Y no olvides:', 'Suma esto:'] as const
const CONTINUE = ['Claro. Además de lo anterior:', 'Va. Esto también ayuda:', 'Perfecto, sigamos:', 'Bien. Otros pasos que sirven:'] as const
const RECAP = ['Como te comenté, lo principal sobre {t} es esto: {s}', 'Te lo resumo otra vez. Con {t}, lo primero es: {s}'] as const
const EXHAUSTED = ['Sobre {t} ya te conté todo lo que tengo de fuentes oficiales.', 'Eso es todo lo que tengo sobre {t}.'] as const
const YES_OPEN = ['¡Claro! Cuéntame qué necesitas.', 'Dime, ¿sobre qué tema te ayudo? Por ejemplo, {e}.', 'Perfecto, pregúntame lo que quieras sobre salud, chacra, vivienda o emergencias.'] as const
const OFFER_MORE = ['¿Quieres que te cuente qué más puedes hacer?', '¿Te doy más recomendaciones sobre esto?', 'Si quieres, te cuento más pasos.'] as const
const OFFER_OTHER = ['¿Quieres que también te cuente sobre {t}?', 'Si te sirve, también puedo contarte sobre {t}.'] as const
const DONE = ['Con eso tienes lo principal sobre {t}. ¿Te ayudo con otro tema?', 'Eso es lo que tengo de fuentes oficiales sobre {t}. ¿Necesitas algo más?'] as const
const DECLINED = ['Está bien. Si necesitas algo más, aquí estoy.', 'De acuerdo. Cuando quieras, me preguntas.', 'Perfecto. Cuídate mucho.'] as const
const ACK = ['Perfecto. ¿Hay algo más en lo que te ayude?', 'Bien. Aquí sigo si necesitas algo.', 'Listo. Cuéntame si tienes otra duda.'] as const
const BYE = ['¡Cuídate mucho! Aquí estaré si me necesitas.', 'Hasta pronto. Recuerda: ante una emergencia, 106 (SAMU) o 116 (Bomberos).', 'Que estés bien. Vuelve cuando quieras.'] as const
const THANKS_AGAIN = ['Con gusto. ¿Te ayudo con algo más?', '¡Para eso estoy! Cuídate mucho.', 'De nada. Aquí sigo si me necesitas.'] as const
const HELLO_AGAIN = ['¡Hola de nuevo! ¿En qué te ayudo?', 'Aquí sigo. Cuéntame qué necesitas.', 'Hola otra vez. ¿Qué te gustaría saber?'] as const
const EMPATHY = ['Te entiendo, es normal preocuparse. Vamos paso a paso.', 'Calma, prepararse es la mejor forma de estar seguro.', 'Entiendo que da miedo; vamos con lo más importante.'] as const
const IF_HAPPENING = ['Si está pasando ahora mismo, llama al {n} ({l}).', 'Y si ya está ocurriendo, no esperes: llama al {n} ({l}).', 'Ten a mano el {n} ({l}) por si pasa ahora.'] as const
const SEE_CENTER = ['Si los síntomas continúan o empeoran, acude a tu centro de salud.', 'Si no mejora o empeora, ve a tu centro de salud.', 'Vigila los síntomas: si empeoran, acude a tu centro de salud.'] as const
const EXAMPLES = ['"cómo evito el dengue"', '"qué hago si viene un huaico"', '"qué llevo en mi mochila de emergencia"', '"cómo protejo mi chacra"'] as const

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w)\}/g, (_, k: string) => values[k] ?? '')

const MORE_WORDS = ['que mas', 'algo mas', 'mas consejos', 'mas pasos', 'otro consejo', 'otra cosa mas', 'dime mas', 'cuentame mas', 'y luego', 'sigue', 'continua', 'mas info', 'mas informacion']
const YES_WORDS = ['si', 'si por favor', 'claro', 'dale', 'ok', 'okey', 'bueno', 'ya', 'por favor', 'si claro', 'si quiero', 'sip', 'de acuerdo', 'va']
const NO_WORDS = ['no', 'no gracias', 'asi esta bien', 'nada mas', 'ya no', 'no por ahora']
const ACK_WORDS = ['ok', 'okey', 'vale', 'entendido', 'listo', 'ya entendi', 'perfecto', 'genial', 'buenisimo']
const BYE_WORDS = ['chau', 'chao', 'adios', 'hasta luego', 'hasta pronto', 'nos vemos', 'bye']
const THANKS_WORDS = ['gracias', 'muchas gracias', 'mil gracias', 'te agradezco']
const HELLO_WORDS = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'saludos', 'hey', 'alo']
const WHO_WORDS = ['quien eres', 'que puedes hacer', 'que haces', 'como funcionas', 'que eres']
const FEAR_WORDS = ['miedo', 'asustado', 'asustada', 'preocupado', 'preocupada', 'nervioso', 'nerviosa', 'angustiado', 'angustiada', 'me da panico']

/** Mensajes cortos tipo "sí", "ok", "chau": se reconocen como frase completa, no como palabra suelta dentro de otra. */
const isShort = (text: string, list: readonly string[]) => text.split(' ').length <= 4 && list.some((w) => text === w || text.startsWith(`${w} `))

/** Devuelve el mismo saludo que usó la persona ("buenos días" → "Buenos días"); si no saludó así, según la hora. */
function dayGreeting(hour?: number, text = ''): string {
  if (text.includes('buenos dias') || text.includes('buen dia')) return 'Buenos días'
  if (text.includes('buenas tardes')) return 'Buenas tardes'
  if (text.includes('buenas noches')) return 'Buenas noches'
  if (hour === undefined) return 'Hola'
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Cómo ofrecer otro consejo: por su tema, o por su título si es del mismo tema ("¿te cuento sobre «Si tienes fiebre…»?"). */
const otherPhrase = (current: OfflineTip, other: OfflineTip) =>
  topicOf(other) === topicOf(current) ? `«${other.title}»` : topicOf(other)

/** Cierre cuando un tema ya se contó entero: ofrece uno relacionado que aún no salió, o pregunta si necesita algo más. */
function closeTopic(session: OfflineSession, tip: OfflineTip, related: OfflineTip | undefined, seed: string, exhausted: boolean): string {
  if (related) {
    session.offer = { tipId: related.id }
    const intro = exhausted ? `${fill(pick(session, EXHAUSTED, seed), { t: topicOf(tip) })} ` : ''
    return intro + fill(pick(session, OFFER_OTHER, seed), { t: otherPhrase(tip, related) })
  }
  session.offer = null
  return fill(pick(session, DONE, seed), { t: topicOf(tip) })
}

/**
 * Cuenta los pasos que faltan de un consejo (hasta 3) y deja ofrecido lo que sigue.
 * `related`: otro consejo del mismo peligro o tema que aún no se contó, para ofrecerlo cuando este se acabe.
 */
function continueTip(session: OfflineSession, tip: OfflineTip, seed: string, related?: OfflineTip): string {
  const from = session.shown[tip.id] ?? 0
  const next = tip.steps.slice(from, from + 3)
  session.lastTips = [tip.id]
  if (next.length === 0) return closeTopic(session, tip, related, seed, true)

  session.shown[tip.id] = from + next.length
  const lines = [pick(session, CONTINUE, seed), numbered(next), '']
  if (tip.steps.length > session.shown[tip.id]) {
    session.offer = { tipId: tip.id }
    lines.push(pick(session, OFFER_MORE, seed))
  } else lines.push(closeTopic(session, tip, related, seed, false))
  return lines.join('\n')
}

// ---- Respuesta (PatyService.cs) ----

const LEVEL_NAMES = ['bajo', 'moderado', 'alto', 'muy alto']
const CENTER_WORDS = [
  'posta', 'hospital', 'clinica', 'medico', 'doctor', 'emergencia',
  'centro de salud', 'centro medico', 'puesto de salud', 'essalud', 'ambulancia', 'atencion medica',
]

// "¿Dónde queda el centro más cercano de ayuda?" no nombra ninguna palabra de la lista de arriba,
// pero es exactamente la pregunta de alguien que necesita que lo atiendan. Se detecta combinando
// una forma de preguntar por un lugar cercano con una palabra de sitio donde se presta ayuda.
const NEARBY_WORDS = ['cerca', 'cercano', 'cercana', 'mas cerca', 'donde queda', 'donde esta', 'donde hay', 'donde puedo', 'donde me', 'como llego', 'llegar a']
const HELP_PLACE_WORDS = ['centro', 'ayuda', 'atencion', 'atiendan', 'atiendo', 'auxilio', 'socorro', 'puesto', 'establecimiento']

/** ¿La persona está buscando dónde la atiendan? Mismo criterio que PatyService.WantsCenter. */
const wantsCenterFrom = (text: string) =>
  hasAny(text, CENTER_WORDS) || (hasAny(text, NEARBY_WORDS) && hasAny(text, HELP_PLACE_WORDS))
const ZONE_WORDS = ['mi zona', 'zona', 'historial', 'antes paso', 'siempre pasa', 'aqui']
const STATUS_WORDS = [
  'mi zona', 'a salvo', 'estoy seguro', 'estoy segura', 'mi seguridad', 'preocupar', 'preocuparme', 'peligro', 'incidencia',
  'incidencias', 'pasa algo', 'esta pasando', 'que pasa', 'riesgo', 'tranquilo', 'tranquila', 'hay alerta', 'hay alertas',
]
const OFFICIAL_WORDS = ['nino', 'fenomeno', 'enfen', 'comunicado', 'boletin']
const FORECAST_WORDS = ['pronostico', 'clima', 'el tiempo', 'temperatura', 'llovera', 'va a llover', 'hara calor', 'hace calor', 'hara frio']
const WARNING_WORDS = ['aviso', 'avisos', 'alertas', 'alerta meteorologica', 'alertas meteorologicas', 'senamhi']
const HAZARD_WORDS = ['huaico', 'huayco', 'quebrada', 'lodo', 'piedras', 'inundacion', 'inunda', 'desborde', 'rio', 'crecida', 'lluvia', 'llueve', 'lluvias', 'aguacero', 'deslizamiento', 'derrumbe', 'cerro', 'dengue', 'zancudo', 'mosquito']
const WEATHER_VOCABULARY = /\b(pronostico|clima|tiempo|temperatura|llovera|llover|va|hoy|manana|avisos?|alertas?|meteorologicas?|senamhi|consultar|cual|para)\b/g

const NUMBER_WORDS = ['numero', 'numeros', 'telefono', 'telefonos', 'a quien llamo']
const SERVICE_WORDS = ['bomberos', 'samu', 'ambulancia', 'policia', 'defensa civil', 'emergencia', 'emergencias']
const GREETING_WORDS = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'gracias', 'ayuda', 'quien eres', 'que puedes hacer', 'que haces', 'tengo miedo']

const NUMBERS_REPLY = 'Números de emergencia en el Perú: 106 SAMU (ambulancia), 116 Bomberos, 115 Defensa Civil y 105 Policía. El 911 funciona en Lima Metropolitana y Callao.'
const NEED_LOCATION_REPLY = 'Para decirte cuál es el más cercano necesito tu ubicación: actívala e inténtalo de nuevo. Si es urgente, llama al SAMU (106).'
const SICK_WORDS = ['enfermo', 'enferma', 'me siento mal', 'se siente mal']
const NO_CONTENT_WORDS = ['friaje', 'helada', 'heladas', 'sequia']
const SICK_REPLY = 'Cuéntame qué síntomas hay (por ejemplo fiebre, diarrea o dificultad para respirar) para orientarte mejor. Si empeora o la persona no reacciona, llama al SAMU (106).'
const NO_CONTENT_REPLY = 'Todavía no tengo información oficial sobre ese tema. Acércate a tu municipalidad o a tu centro de salud. Si es urgente, llama al SAMU (106).'
const CRISIS_REPLY ='No tienes que pasar por esto sin ayuda. Llama ahora a la Línea 113 del MINSA y pide orientación en salud mental (gratuita, las 24 horas), o al SAMU (106). Si puedes, busca a alguien de confianza y quédate con esa persona.'

const MEDICAL_FIRST_MEASURE = 'no dejes sola a la persona, mantenla en un lugar seguro y ventilado, y no le des medicamentos, comida ni bebida si está somnolienta o inconsciente.'

/** El 911 opera en la provincia de Lima (ubigeo 1501…) y en el Callao (07…). */
const has911 = (ubigeo?: string) => !!ubigeo && (ubigeo.startsWith('1501') || ubigeo.startsWith('07'))

function prepQuery(hazard: string | null | undefined): string {
  if (hazard === 'Huaico') return 'preparate antes huaicos'
  if (hazard === 'Inundacion') return 'preparate antes inundaciones'
  if (hazard === 'Deslizamiento') return 'preparate antes deslizamiento derrumbe'
  return 'preparate antes lluvias huaicos inundaciones'
}

/** Sin conexión no se conocen las alertas de hoy: nunca se afirma que la persona está a salvo. */
function statusAnswer(district: OfflineDistrict | null, month: number): string {
  if (!district) {
    return 'Sin conexión y sin tu ubicación no puedo confirmar si hay alertas en tu zona. Si ves peligro, llama al 116 (Bomberos) o al 106 (SAMU).'
  }
  const level = Number(district.r[month])
  const hazard = district.hn ?? 'lluvias fuertes'
  let answer = `Sin conexión no puedo confirmar las alertas de hoy en ${district.n}.`
  if (level >= 2) answer += ` Según el historial, este mes el riesgo es ${LEVEL_NAMES[level]}: aquí lo más frecuente son las emergencias por ${hazard}, así que vale la pena tener todo listo.`
  else if (level === 1) answer += ' Según el historial, el riesgo de emergencias este mes es moderado.'
  else if (level === 0) answer += ' Según el historial, el riesgo de emergencias este mes es bajo.'
  return answer + ' Si ves peligro, llama al 116 (Bomberos) o al 106 (SAMU).'
}

/**
 * Responde sin red. `month` es el mes actual con enero = 0.
 * Con `coords` y `geo` añade el distrito, su riesgo y las postas cercanas.
 * Con `session` recuerda la conversación (no repite frases ni pasos y entiende "¿qué más?" o "sí"); sin ella, cada
 * mensaje se responde como el primero.
 */
export function answerOffline(
  message: string,
  knowledge: OfflineKnowledge,
  geo: OfflineGeo | null,
  coords: Coords | null,
  month: number,
  session?: OfflineSession,
): PatyReply {
  const s = session ?? newOfflineSession()
  const reply = buildReply(message, knowledge, geo, coords, month, s)
  s.turn++
  return reply
}

function buildReply(
  message: string,
  knowledge: OfflineKnowledge,
  geo: OfflineGeo | null,
  coords: Coords | null,
  month: number,
  s: OfflineSession,
): PatyReply {
  const text = normalize(message)
  const seed = text
  const tri = triage(message, knowledge)
  const grave = tri.level === 'Grave'
  const medical = tri.emergencyType === 'Medica'
  const district = coords && geo ? locate(geo.districts, coords.latitude, coords.longitude) : null
  const ubigeo = district?.u
  const offer911 = has911(ubigeo) && !medical
  const location = district ? { district: district.n, province: district.p, department: district.d } : null
  const plain = (reply: string, extra: Partial<PatyReply> = {}): PatyReply => ({
    reply, location, triage: tri, tips: [], zoneWarnings: [], officialNotices: [], nearestCenters: [], actions: [],
    usedAi: false, offline: true, ...extra,
  })
  const refs = (tips: OfflineTip[]): TipReference[] =>
    tips.map((t) => ({ id: t.id, title: t.title, source: t.source, steps: t.steps, sourceUrl: t.sourceUrl }))
  const tipById = (id: string) => knowledge.tips.find((t) => t.id === id)

  // ¿Pide los números de emergencia? Se dan directo, con sus botones
  if (!grave && hasAny(text, NUMBER_WORDS) && hasAny(text, SERVICE_WORDS)) {
    const call = (label: string, value: string): PatyAction => ({ type: 'llamar', label: `Llamar al ${value} (${label})`, value })
    s.offer = null
    return plain(NUMBERS_REPLY, {
      actions: [
        ...(has911(ubigeo) ? [call('Central Única de Emergencias', '911')] : []),
        call('SAMU – ambulancia', '106'),
        call('Bomberos', '116'),
        call('Defensa Civil', '115'),
        call('Policía', '105'),
      ],
    })
  }

  // Seguimiento de la conversación: "sí" a lo ofrecido, "¿qué más?", "no", "ok", "chau"…
  // Solo con mensajes tranquilos: una emergencia nunca se toma como respuesta a una pregunta anterior.
  if (tri.level === 'Leve' && !isCrisis(text)) {
    // Otro consejo afín que aún no se contó, para ofrecerlo cuando el actual se acaba: mismo tema, o el que comparte
    // más palabras clave (de la chacra se pasa a las plagas, no a las diarreas solo porque ambos son "lluvias")
    const related = (tip: OfflineTip) => {
      const own = new Set(tip.keywords.map(normalize))
      return knowledge.tips
        .filter((t) => t.id !== tip.id && !s.shown[t.id])
        .map((t) => ({ t, score: (normalize(t.topic) === normalize(tip.topic) ? 10 : 0) + t.keywords.filter((k) => own.has(normalize(k))).length }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.t
    }
    const offered = s.offer ? tipById(s.offer.tipId) : undefined
    if (offered && isShort(text, YES_WORDS)) {
      const fresh = !s.shown[offered.id]
      const reply = fresh ? tipAnswer(s, offered, [related(offered)].filter((t) => t !== undefined), seed) : continueTip(s, offered, seed, related(offered))
      return plain(reply, { tips: refs([offered]) })
    }
    if (s.offer && isShort(text, NO_WORDS)) {
      s.offer = null
      return plain(pick(s, DECLINED, seed))
    }
    const last = s.lastTips[0] ? tipById(s.lastTips[0]) : undefined
    if (last && isShort(text, MORE_WORDS)) return plain(continueTip(s, last, seed, related(last)), { tips: refs([last]) })
    if (isShort(text, BYE_WORDS)) {
      s.offer = null
      return plain(pick(s, BYE, seed))
    }
    if (!s.offer && isShort(text, ACK_WORDS)) return plain(pick(s, ACK, seed))
    // "Sí" a una pregunta abierta ("¿necesitas algo más?"): se invita a contar qué necesita
    if (!s.offer && isShort(text, YES_WORDS)) return plain(fill(pick(s, YES_OPEN, seed), { e: pick(s, EXAMPLES, `${seed}y`) }))
  }

  // Malestar sin síntomas concretos, o un tema sin contenido oficial: se orienta en vez de dar un consejo al azar
  const sick = tri.level === 'Leve' && hasAny(text, SICK_WORDS)
  if (sick || (!grave && hasAny(text, NO_CONTENT_WORDS))) {
    s.offer = null
    return plain(sick ? SICK_REPLY : NO_CONTENT_REPLY, { actions: [{ type: 'llamar', label: 'Llamar al 106 (SAMU – ambulancia)', value: '106' }] })
  }

  // ¿Pregunta por su zona o su seguridad?
  const asksStatus = !grave && hasAny(text, STATUS_WORDS)
  const mentionsHazard = hasAny(text, HAZARD_WORDS)

  // Consejos
  const searchText = asksStatus && !mentionsHazard ? prepQuery(district?.h) : text.replace(WEATHER_VOCABULARY, ' ')
  let tips = searchTips(searchText, knowledge, 6)
  const first = grave ? 'Durante' : asksStatus ? 'Antes' : null
  if (first) tips = [...tips].sort((a, b) => Number(b.phase === first) - Number(a.phase === first))
  tips = tips.slice(0, asksStatus ? 1 : 3)

  // Riesgo de la zona (tabla generada con el modelo XGBoost). Se cuenta una vez por conversación, salvo que lo pregunte.
  const zoneWarnings: string[] = []
  const asksZone = hasAny(text, ZONE_WORDS)
  if (district && !asksStatus && (asksZone || !s.zoneTold)) {
    const level = Number(district.r[month])
    const probability = district.pr[month]
    if (probability >= 0 && (asksZone || level >= 2)) {
      zoneWarnings.push(
        `Este mes, el modelo de riesgo de Paty estima ${probability}% de probabilidad de emergencia por lluvias en tu distrito (riesgo ${LEVEL_NAMES[level]}), según el historial del INDECI.`,
      )
    }
    if (asksZone && district.hn) zoneWarnings.push(`En ${district.n}, lo más frecuente son las emergencias por ${district.hn}.`)
    if (zoneWarnings.length > 0) s.zoneTold = true
  }

  // Avisos: el último boletín guardado (con su fecha); el clima de hoy necesita conexión
  const notices: string[] = []
  if (!asksStatus && knowledge.enfen && (hasAny(text, OFFICIAL_WORDS) || asksZone)) {
    const { title, publishedAt, alertStatus, summary } = knowledge.enfen
    const date = publishedAt.slice(0, 10).split('-').reverse().join('/')
    notices.push(`Según el ${title} (${date}): ${alertStatus}. ${summary}`)
  }
  if (!asksStatus && (hasAny(text, FORECAST_WORDS) || hasAny(text, WARNING_WORDS))) {
    notices.push('Sin conexión no puedo consultar el pronóstico ni los avisos del SENAMHI.')
  }

  // Postas
  const wantsCenter = wantsCenterFrom(text)
  const nearest =
    coords && geo && district && (wantsCenter || (tri.level !== 'Leve' && medical))
      ? nearestCenters(geo.centers, coords.latitude, coords.longitude, 3, grave)
      : []

  // Botones
  const actions: PatyAction[] = []
  if (grave) {
    if (offer911) actions.push({ type: 'llamar', label: 'Llamar al 911 (Central Única de Emergencias)', value: '911' })
    actions.push({ type: 'llamar', label: `Llamar al ${tri.phoneNumber} (${tri.phoneLabel})`, value: tri.phoneNumber })
    if (!medical) {
      actions.push({ type: 'llamar', label: 'Llamar al 115 (Defensa Civil)', value: '115' })
      actions.push({ type: 'ver_zona_segura', label: 'Ver zona segura' })
    }
  } else if (tri.phoneNumber) {
    actions.push({ type: 'llamar', label: `Llamar al ${tri.phoneNumber} (${tri.phoneLabel})`, value: tri.phoneNumber })
  }
  if (isCrisis(text)) actions.unshift({ type: 'llamar', label: 'Llamar al 113 (salud mental)', value: '113' })
  if (nearest.length > 0 || wantsCenter || (tri.level !== 'Leve' && medical)) {
    actions.push({ type: 'ver_centros', label: 'Ver centro de salud más cercano' })
  }

  // Texto
  if (grave || isCrisis(text)) s.offer = null
  let reply: string
  if (isCrisis(text)) reply = CRISIS_REPLY
  else if (asksStatus) {
    const prep = tips[0]
    if (prep) {
      s.shown[prep.id] = Math.max(s.shown[prep.id] ?? 0, Math.min(3, prep.steps.length))
      s.offer = prep.steps.length > 3 ? { tipId: prep.id } : null
    }
    reply = [statusAnswer(district, month), ...(prep ? [`Para estar preparado:\n${numbered(prep.steps)}`] : []), ...(s.offer ? [pick(s, OFFER_MORE, seed)] : [])].join('\n\n')
  } else {
    reply = templateReply({
      session: s, seed, text, grave, medical, moderate: tri.level === 'Moderado', phone: tri.phoneNumber, label: tri.phoneLabel,
      offer911, wantsCenter, nearest, tips, zoneWarnings, notices, district, knowledge,
    })
  }
  if (tips.length > 0 && !grave) s.lastTips = tips.map((t) => t.id)

  return plain(reply, { tips: refs(tips), zoneWarnings, officialNotices: notices, nearestCenters: nearest, actions })
}

const oneDecimal = (km: number) => (Math.round(km * 10) / 10).toFixed(1)

const numbered = (steps: string[]) => steps.slice(0, 3).map((s, i) => `${i + 1}. ${withPeriod(s)}`).join('\n')

/**
 * Respuesta a un consejo, como la daría una persona: primero la idea principal en una frase, luego solo 2 pasos más,
 * y al final una pregunta que invita a seguir ("¿quieres más pasos?" / "¿te cuento sobre…?"). Si el consejo ya se
 * dio en esta conversación, sigue donde quedó en vez de repetirlo igual.
 */
function tipAnswer(s: OfflineSession, tip: OfflineTip, others: OfflineTip[], seed: string): string {
  const from = s.shown[tip.id] ?? 0
  if (from > 0 && from < tip.steps.length) return continueTip(s, tip, seed, others.find((o) => !s.shown[o.id]))

  const t = topicOf(tip)
  const lead = fill(pick(s, from > 0 ? RECAP : OPENERS[tip.phase], seed), { t, s: lowerFirst(withPeriod(tip.steps[0])).replace(': ', '; ') })
  const rest = tip.steps.slice(1, 3)
  s.shown[tip.id] = Math.max(from, 1 + rest.length)
  const lines = [lead]
  if (rest.length > 0) lines.push('', pick(s, ALSO, seed), numbered(rest))

  const other = others.find((o) => !s.shown[o.id])
  if (tip.steps.length > s.shown[tip.id]) {
    s.offer = { tipId: tip.id }
    lines.push('', pick(s, OFFER_MORE, seed))
  } else if (other) {
    s.offer = { tipId: other.id }
    lines.push('', fill(pick(s, OFFER_OTHER, seed), { t: otherPhrase(tip, other) }))
  } else s.offer = null
  s.lastTips = [tip.id, ...others.map((o) => o.id)]
  return lines.join('\n')
}

/** Saludo, agradecimiento, "¿quién eres?", miedo…: respuesta cálida y variada, sin repetir la presentación. */
function smallTalk(s: OfflineSession, text: string, knowledge: OfflineKnowledge, seed: string): string | null {
  const intro = () =>
    `Te ayudo a prepararte ante El Niño: tu salud, tu chacra, tu casa y las emergencias. Puedes preguntarme, por ejemplo, ` +
    `${pick(s, EXAMPLES, seed)} o ${pick(s, EXAMPLES, `${seed}2`)}. Si estás en peligro, cuéntame qué pasa o llama al 106 (SAMU) o al 116 (Bomberos).`

  if (hasAny(text, WHO_WORDS)) {
    s.greeted = true
    return `Hola, soy Paty, tu asistente de prevención. ${intro()}`
  }
  if (hasAny(text, FEAR_WORDS)) {
    s.greeted = true
    const bag = knowledge.tips.find((t) => normalize(t.topic) === 'mochila de emergencia')
    if (bag && !s.shown[bag.id]) {
      s.offer = { tipId: bag.id }
      return `${pick(s, EMPATHY, seed)} Aquí estoy, soy Paty y te acompaño. Tener todo listo da mucha tranquilidad: ¿quieres que armemos juntos tu mochila de emergencia?`
    }
    return `${pick(s, EMPATHY, seed)} Aquí estoy, soy Paty y te acompaño. Cuéntame qué te preocupa y vemos qué hacer.`
  }
  if (hasAny(text, THANKS_WORDS)) {
    if (s.greeted) return pick(s, THANKS_AGAIN, seed)
    s.greeted = true
    return '¡De nada! Para eso estoy: soy Paty y aquí estaré cuando me necesites. Ante una emergencia: 106 (SAMU) o 116 (Bomberos).'
  }
  if (isShort(text, ['ayuda', 'ayudame', 'necesito ayuda'])) {
    s.greeted = true
    return 'Aquí estoy, soy Paty. Si es una emergencia, llama ya al 106 (SAMU) o al 116 (Bomberos). Si no, cuéntame qué pasa y te oriento.'
  }
  if (hasAny(text, HELLO_WORDS) || hasAny(text, GREETING_WORDS)) {
    if (s.greeted) return pick(s, HELLO_AGAIN, seed)
    s.greeted = true
    return `${dayGreeting(s.hour, text)}, soy Paty. ${intro()}`
  }
  return null
}

const OFF_TOPIC_REPLIES = [
  'Solo puedo ayudarte con la prevención ante el Fenómeno El Niño: tu salud, tu chacra, tu casa y las emergencias. Si es urgente, llama al SAMU (106) o acércate a tu centro de salud.',
  'Solo puedo ayudarte con temas de El Niño: salud, chacra, vivienda y emergencias. Pregúntame, por ejemplo, {e}.',
  'Solo puedo ayudarte con la prevención ante El Niño. ¿Te cuento, por ejemplo, {e}?',
] as const

function templateReply(o: {
  session: OfflineSession
  seed: string
  text: string
  grave: boolean
  medical: boolean
  moderate: boolean
  phone?: string | null
  label?: string | null
  offer911: boolean
  wantsCenter: boolean
  nearest: NearbyHealthCenter[]
  tips: OfflineTip[]
  zoneWarnings: string[]
  notices: string[]
  district: OfflineDistrict | null
  knowledge: OfflineKnowledge
}): string {
  const s = o.session
  const lines: string[] = []
  if (o.grave) {
    // Emergencia grave: texto fijo y verificado, sin variaciones. Lo primero, siempre, es a quién llamar.
    const call = o.offer911 ? `Llama al 911 o al ${o.phone} (${o.label}) ahora.` : `Llama al ${o.phone} (${o.label}) ahora.`
    lines.push(`⚠️ Esto puede ser una emergencia. ${call}`)
    if (o.nearest[0]) lines.push(`El establecimiento con emergencias más cercano es ${o.nearest[0].center.name}, a ${oneDecimal(o.nearest[0].distanceKm)} km.`)
    if (o.medical) {
      // Emergencia médica: solo la medida inmediata y el número; consejos de temporada aquí estorban
      return [...lines, '', `Mientras llega la ayuda: ${MEDICAL_FIRST_MEASURE}`].join('\n')
    }
    if (o.tips.length > 0) lines.push('', 'Mientras llega la ayuda:', numbered(o.tips[0].steps))
  } else {
    if (o.wantsCenter && o.nearest[0]) {
      const n = o.nearest[0]
      lines.push(`El establecimiento de salud más cercano es ${n.center.name}, a ${oneDecimal(n.distanceKm)} km (unos ${n.walkingMinutes} minutos caminando).`)
    } else if (o.wantsCenter) {
      // Sabemos qué quiere, pero no dónde está: se dice eso, nunca que no podemos ayudar
      lines.push('Para decirte cuál es el establecimiento de salud más cercano necesito tu ubicación: actívala y vuelve a preguntarme.')
      lines.push('Si es urgente, llama al 106 (SAMU) o al 911 en Lima y Callao.')
    }

    if (o.tips.length > 0) {
      // Saludo o miedo junto con la pregunta: se responde a ambos, como lo haría una persona
      const prefix: string[] = []
      if (hasAny(o.text, HELLO_WORDS) && !s.greeted) {
        prefix.push(`¡${dayGreeting(s.hour, o.text)}!`)
        s.greeted = true
      }
      if (hasAny(o.text, FEAR_WORDS)) prefix.push(pick(s, EMPATHY, o.seed))
      const answer = tipAnswer(s, o.tips[0], o.tips.slice(1), o.seed)
      if (lines.length > 0) lines.push('')
      lines.push(prefix.length > 0 ? `${prefix.join(' ')} ${answer}` : answer)
    }

    if (o.moderate && o.medical) lines.push('', pick(s, SEE_CENTER, o.seed))
    // Pregunta sobre un peligro grave: se responde, pero el número queda a mano por si está pasando ahora
    if (o.phone) lines.push('', fill(pick(s, IF_HAPPENING, o.seed), { n: o.phone, l: o.label ?? '' }))
  }
  for (const w of o.zoneWarnings) lines.push('', `📍 ${w}`)
  for (const n of o.notices) lines.push('', `📢 ${n}`)

  if (lines.length > 0) return lines.join('\n').trim()
  if (o.wantsCenter) return NEED_LOCATION_REPLY
  const small = smallTalk(s, o.text, o.knowledge, o.seed)
  if (small) return small
  s.offer = null
  return fill(pick(s, OFF_TOPIC_REPLIES, o.seed), { e: pick(s, EXAMPLES, `${o.seed}e`) })
}

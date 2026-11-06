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

// ---- Respuesta (PatyService.cs) ----

const LEVEL_NAMES = ['bajo', 'moderado', 'alto', 'muy alto']
const CENTER_WORDS = ['posta', 'hospital', 'centro de salud', 'clinica', 'medico', 'doctor', 'emergencia']
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
const GREETING_REPLY = 'Hola, soy Paty. Te ayudo a prepararte ante El Niño: tu salud, tu chacra, tu casa y las emergencias. Pregúntame, por ejemplo, "cómo evito el dengue" o "qué hago si viene un huaico". Si estás en peligro, cuéntame qué pasa o llama al 106 (SAMU) o al 116 (Bomberos).'
const NEED_LOCATION_REPLY = 'Para decirte cuál es el más cercano necesito tu ubicación: actívala e inténtalo de nuevo. Si es urgente, llama al SAMU (106).'
const SICK_WORDS = ['enfermo', 'enferma', 'me siento mal', 'se siente mal']
const NO_CONTENT_WORDS = ['friaje', 'helada', 'heladas', 'sequia']
const SICK_REPLY = 'Cuéntame qué síntomas hay (por ejemplo fiebre, diarrea o dificultad para respirar) para orientarte mejor. Si empeora o la persona no reacciona, llama al SAMU (106).'
const NO_CONTENT_REPLY = 'Todavía no tengo información oficial sobre ese tema. Acércate a tu municipalidad o a tu centro de salud. Si es urgente, llama al SAMU (106).'
const CRISIS_REPLY ='No tienes que pasar por esto sin ayuda. Llama ahora a la Línea 113 del MINSA y pide orientación en salud mental (gratuita, las 24 horas), o al SAMU (106). Si puedes, busca a alguien de confianza y quédate con esa persona.'

const OFF_TOPIC = 'Solo puedo ayudarte con la prevención ante el Fenómeno El Niño: tu salud, tu chacra, tu casa y las emergencias.'
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
 */
export function answerOffline(
  message: string,
  knowledge: OfflineKnowledge,
  geo: OfflineGeo | null,
  coords: Coords | null,
  month: number,
): PatyReply {
  const text = normalize(message)
  const tri = triage(message, knowledge)
  const grave = tri.level === 'Grave'
  const medical = tri.emergencyType === 'Medica'
  const district = coords && geo ? locate(geo.districts, coords.latitude, coords.longitude) : null
  const ubigeo = district?.u
  const offer911 = has911(ubigeo) && !medical
  const location = district ? { district: district.n, province: district.p, department: district.d } : null

  // ¿Pide los números de emergencia? Se dan directo, con sus botones
  if (!grave && hasAny(text, NUMBER_WORDS) && hasAny(text, SERVICE_WORDS)) {
    const call = (label: string, value: string): PatyAction => ({ type: 'llamar', label: `Llamar al ${value} (${label})`, value })
    return {
      reply: NUMBERS_REPLY,
      location,
      triage: tri,
      tips: [],
      zoneWarnings: [],
      officialNotices: [],
      nearestCenters: [],
      actions: [
        ...(has911(ubigeo) ? [call('Central Única de Emergencias', '911')] : []),
        call('SAMU – ambulancia', '106'),
        call('Bomberos', '116'),
        call('Defensa Civil', '115'),
        call('Policía', '105'),
      ],
      usedAi: false,
      offline: true,
    }
  }

  // Malestar sin síntomas concretos, o un tema sin contenido oficial: se orienta en vez de dar un consejo al azar
  const sick = tri.level === 'Leve' && hasAny(text, SICK_WORDS)
  if (sick || (!grave && hasAny(text, NO_CONTENT_WORDS))) {
    return {
      reply: sick ? SICK_REPLY : NO_CONTENT_REPLY,
      location,
      triage: tri,
      tips: [],
      zoneWarnings: [],
      officialNotices: [],
      nearestCenters: [],
      actions: [{ type: 'llamar', label: 'Llamar al 106 (SAMU – ambulancia)', value: '106' }],
      usedAi: false,
      offline: true,
    }
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

  // Riesgo de la zona (tabla generada con el modelo XGBoost)
  const zoneWarnings: string[] = []
  const asksZone = hasAny(text, ZONE_WORDS)
  if (district && !asksStatus) {
    const level = Number(district.r[month])
    const probability = district.pr[month]
    if (probability >= 0 && (asksZone || level >= 2)) {
      zoneWarnings.push(
        `Este mes, el modelo de riesgo de Paty estima ${probability}% de probabilidad de emergencia por lluvias en tu distrito (riesgo ${LEVEL_NAMES[level]}), según el historial del INDECI.`,
      )
    }
    if (asksZone && district.hn) zoneWarnings.push(`En ${district.n}, lo más frecuente son las emergencias por ${district.hn}.`)
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
  const wantsCenter = hasAny(text, CENTER_WORDS)
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
  const tipRefs: TipReference[] = tips.map((t) => ({ id: t.id, title: t.title, source: t.source, steps: t.steps, sourceUrl: t.sourceUrl }))
  const reply = isCrisis(text)
    ? CRISIS_REPLY
    : asksStatus
      ? [statusAnswer(district, month), ...(tips[0] ? [`Para estar preparado:\n${numbered(tips[0].steps)}`] : [])].join('\n\n')
      : templateReply({ text, grave, medical, moderate: tri.level === 'Moderado', phone: tri.phoneNumber, label: tri.phoneLabel, offer911, wantsCenter, nearest, tips, zoneWarnings, notices })

  return {
    reply,
    location,
    triage: tri,
    tips: tipRefs,
    zoneWarnings,
    officialNotices: notices,
    nearestCenters: nearest,
    actions,
    usedAi: false,
    offline: true,
  }
}

const oneDecimal = (km: number) => (Math.round(km * 10) / 10).toFixed(1)

const numbered = (steps: string[]) => steps.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')

function templateReply(o: {
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
}): string {
  const lines: string[] = []
  if (o.grave) {
    const call = o.offer911 ? `Llama al 911 o al ${o.phone} (${o.label}) ahora.` : `Llama al ${o.phone} (${o.label}) ahora.`
    lines.push(`⚠️ Esto puede ser una emergencia. ${call}`)
    if (o.nearest[0]) lines.push(`El establecimiento con emergencias más cercano es ${o.nearest[0].center.name}, a ${oneDecimal(o.nearest[0].distanceKm)} km.`)
    if (o.medical) {
      // Emergencia médica: solo la medida inmediata y el número; consejos de temporada aquí estorban
      return [...lines, '', `Mientras llega la ayuda: ${MEDICAL_FIRST_MEASURE}`].join('\n')
    }
    if (o.tips.length > 0) lines.push('', 'Mientras llega la ayuda:')
  } else if (o.wantsCenter && o.nearest[0]) {
    const n = o.nearest[0]
    lines.push(`El establecimiento de salud más cercano es ${n.center.name}, a ${oneDecimal(n.distanceKm)} km (unos ${n.walkingMinutes} minutos caminando).`)
  }

  if (o.tips.length > 0) {
    if (!o.grave) lines.push(`${o.tips[0].title}:`)
    lines.push(numbered(o.tips[0].steps))
    const others = o.tips.slice(1).map((t) => `${t.title} (${t.source})`)
    if (others.length > 0) lines.push('', `También te puede servir: ${others.join('; ')}.`)
  }

  if (o.moderate && o.medical) lines.push('', 'Si los síntomas continúan o empeoran, acude a tu centro de salud.')
  // Pregunta sobre un peligro grave: se responde, pero el número queda a mano por si está pasando ahora
  if (!o.grave && o.phone) lines.push('', `Si está pasando ahora mismo, llama al ${o.phone} (${o.label}).`)
  for (const w of o.zoneWarnings) lines.push('', `📍 ${w}`)
  for (const n of o.notices) lines.push('', `📢 ${n}`)

  if (lines.length > 0) return lines.join('\n').trim()
  if (o.wantsCenter) return NEED_LOCATION_REPLY
  if (hasAny(o.text, GREETING_WORDS)) return GREETING_REPLY
  return `${OFF_TOPIC} Si es urgente, llama al SAMU (106) o acércate a tu centro de salud.`
}

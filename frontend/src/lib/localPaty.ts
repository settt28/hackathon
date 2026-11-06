/**
 * Paty sin conexión: la IA local del dispositivo.
 *
 * Es el mismo cerebro por reglas del backend (ElNino.Core/Services: TriageService, TipSearchService,
 * HealthCenterService y las plantillas de PatyService) ejecutándose en el teléfono, con los datos
 * oficiales del paquete offline. No inventa nada: solo triaje por palabras de alarma, búsqueda de
 * consejos por palabras clave y la posta más cercana por distancia.
 *
 * Por qué por reglas y no un modelo de lenguaje en el navegador: en una emergencia las indicaciones
 * tienen que ser las verificadas del MINSA/INDECI, y un celular de gama baja en una zona sin señal
 * no puede descargar ni ejecutar cientos de MB de pesos.
 */
import type { NearbyHealthCenter, PatyAction, PatyReply, TipReference, TriageLevel } from './api'
import { getOfflinePack, type OfflineCenter, type OfflineKeyword, type OfflineTip } from './sync'
import { containsTerm, normalize, sameStem, words } from './textNormalizer'

const MEDICAL_FIRST_MEASURE =
  'no dejes sola a la persona, mantenla en un lugar seguro y ventilado, y no le des medicamentos, comida ni bebida si está somnolienta o inconsciente.'

const OFF_TOPIC_REPLY =
  'Solo puedo ayudarte con la prevención ante el Fenómeno El Niño: tu salud, tu chacra, tu casa y las emergencias.'

const SAMU = '106'
const BOMBEROS = '116'
const DEFENSA_CIVIL = '115'
const CENTRAL_911 = '911'

// Palabras que indican que la persona busca un establecimiento de salud
const CENTER_WORDS = ['posta', 'hospital', 'centro de salud', 'clinica', 'medico', 'doctor', 'emergencia']

// Palabras que piden información de la zona
const ZONE_WORDS = ['mi zona', 'zona', 'historial', 'antes paso', 'siempre pasa', 'aqui']

// Pistas del momento del evento en la pregunta
const AFTER_WORDS = ['despues', 'paso', 'regresar', 'volver', 'limpiar', 'ya paso']
const DURING_WORDS = ['viene', 'ahora', 'entrando', 'durante', 'esta pasando', 'tengo', 'tiene']

/** ¿El distrito está donde opera el 911? Provincia de Lima (ubigeo 1501…) o Callao (07…). */
const has911 = (ubigeo: string | null) => !!ubigeo && (ubigeo.startsWith('1501') || ubigeo.startsWith('07'))

const LEVEL_RANK: Record<TriageLevel, number> = { Leve: 0, Moderado: 1, Grave: 2 }

// ---- 1) Triaje por palabras de alarma ----

interface Triage {
  level: TriageLevel
  emergencyType: 'Medica' | 'Desastre' | null
  phoneNumber: string | null
  phoneLabel: string | null
}

function triage(message: string, keywords: OfflineKeyword[]): Triage {
  const text = normalize(message)
  const matches = keywords.filter((k) => containsTerm(text, normalize(k.term)))
  if (matches.length === 0) return { level: 'Leve', emergencyType: null, phoneNumber: null, phoneLabel: null }

  const level = matches.reduce<TriageLevel>((top, m) => (LEVEL_RANK[m.level] > LEVEL_RANK[top] ? m.level : top), 'Leve')
  const top = matches.filter((m) => m.level === level)
  // Si hay señales médicas y de desastre al mismo nivel, prima la médica (la vida de la persona).
  const emergencyType = top.some((m) => m.emergencyType === 'Medica') ? 'Medica' : 'Desastre'

  if (level !== 'Grave') return { level, emergencyType, phoneNumber: null, phoneLabel: null }
  return emergencyType === 'Medica'
    ? { level, emergencyType, phoneNumber: SAMU, phoneLabel: 'SAMU – ambulancia' }
    : { level, emergencyType, phoneNumber: BOMBEROS, phoneLabel: 'Bomberos' }
}

// ---- 2) Búsqueda de consejos (la "R" del RAG, por palabras clave) ----

const PHASE_ORDER = { Antes: 0, Durante: 1, Despues: 2 } as const

function detectPhase(normalizedText: string): keyof typeof PHASE_ORDER {
  if (AFTER_WORDS.some((w) => containsTerm(normalizedText, w))) return 'Despues'
  if (DURING_WORDS.some((w) => containsTerm(normalizedText, w))) return 'Durante'
  return 'Antes' // por defecto: es una app de prevención
}

function score(tip: OfflineTip, queryWords: string[]): number {
  const keywords = (tip.keywords ?? []).map(normalize)
  const titleWords = words(`${tip.title} ${tip.topic}`)
  let total = 0
  for (const w of queryWords) {
    if (keywords.some((k) => sameStem(k, w))) total += 3
    if (titleWords.some((tw) => sameStem(tw, w))) total += 1
  }
  return total
}

function searchTips(message: string, tips: OfflineTip[], take: number): OfflineTip[] {
  // "El Niño" (el fenómeno) no debe confundirse con "niño" (un menor): se une en un solo término
  const queryWords = words(normalize(message).replaceAll('el nino', 'elnino'))
  if (queryWords.length === 0) return []

  const phase = detectPhase(normalize(message))
  return tips
    .map((tip) => ({ tip, s: score(tip, queryWords) }))
    .filter((x) => x.s > 0)
    .map((x) => ({ tip: x.tip, s: x.s + (x.tip.phase === phase ? 2 : 0) }))
    .sort((a, b) => b.s - a.s || PHASE_ORDER[a.tip.phase] - PHASE_ORDER[b.tip.phase])
    .slice(0, take)
    .map((x) => x.tip)
}

// ---- 3) Postas más cercanas ----

/** Distancia en km entre dos puntos (fórmula de Haversine), igual que GeoUtils.HaversineKm. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** 4 km/h en terreno urbano, con un mínimo de 1 minuto (igual que GeoUtils.WalkingMinutes). */
const walkingMinutes = (km: number) => Math.max(1, Math.round((km / 4) * 60))

function nearestCenters(
  centers: OfflineCenter[],
  coords: { latitude: number; longitude: number },
  take: number,
  emergencyOnly: boolean,
): NearbyHealthCenter[] {
  return centers
    .filter((c) => !emergencyOnly || c.handlesEmergencies)
    .map((c) => {
      const distanceKm = Math.round(haversineKm(coords.latitude, coords.longitude, c.latitude, c.longitude) * 100) / 100
      return {
        center: { name: c.name, type: c.type, phone: c.phone ?? null, latitude: c.latitude, longitude: c.longitude },
        distanceKm,
        walkingMinutes: walkingMinutes(distanceKm),
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, take)
}

// ---- 4) Redacción de la respuesta ----

const km1 = (n: number) => n.toFixed(1).replace(/\.0$/, '')

const offer911 = (tri: Triage, ubigeo: string | null) => has911(ubigeo) && tri.emergencyType !== 'Medica'

const callNow = (tri: Triage, ubigeo: string | null) =>
  offer911(tri, ubigeo)
    ? `Llama al ${CENTRAL_911} o al ${tri.phoneNumber} (${tri.phoneLabel}) ahora.`
    : `Llama al ${tri.phoneNumber} (${tri.phoneLabel}) ahora.`

function buildActions(tri: Triage, wantsCenter: boolean, nearest: NearbyHealthCenter[], ubigeo: string | null): PatyAction[] {
  const actions: PatyAction[] = []
  if (tri.level === 'Grave') {
    if (offer911(tri, ubigeo))
      actions.push({ type: 'llamar', label: `Llamar al ${CENTRAL_911} (Central Única de Emergencias)`, value: CENTRAL_911 })
    actions.push({ type: 'llamar', label: `Llamar al ${tri.phoneNumber} (${tri.phoneLabel})`, value: tri.phoneNumber })
    if (tri.emergencyType === 'Desastre') {
      actions.push({ type: 'llamar', label: `Llamar al ${DEFENSA_CIVIL} (Defensa Civil)`, value: DEFENSA_CIVIL })
      actions.push({ type: 'ver_zona_segura', label: 'Ver zona segura' })
    }
  }
  if (nearest.length > 0 || wantsCenter || (tri.level !== 'Leve' && tri.emergencyType === 'Medica'))
    actions.push({ type: 'ver_centros', label: 'Ver centro de salud más cercano' })
  return actions
}

function buildReply(
  tri: Triage,
  tips: OfflineTip[],
  zoneWarnings: string[],
  notices: string[],
  nearest: NearbyHealthCenter[],
  wantsCenter: boolean,
  ubigeo: string | null,
): string {
  const parts: string[] = []

  if (tri.level === 'Grave') {
    const head = [`⚠️ Esto puede ser una emergencia. ${callNow(tri, ubigeo)}`]
    if (nearest.length > 0)
      head.push(`El establecimiento con emergencias más cercano es ${nearest[0].center.name}, a ${km1(nearest[0].distanceKm)} km.`)
    parts.push(head.join('\n'))

    if (tri.emergencyType === 'Medica') {
      // Emergencia médica: solo la medida inmediata y el número; consejos de temporada aquí estorban
      parts.push(`Mientras llega la ayuda: ${MEDICAL_FIRST_MEASURE}`)
      return parts.join('\n\n')
    }
    if (tips.length > 0) parts.push('Mientras llega la ayuda:')
  } else if (wantsCenter && nearest.length > 0) {
    const n = nearest[0]
    parts.push(
      `El establecimiento de salud más cercano es ${n.center.name}, a ${km1(n.distanceKm)} km (unos ${n.walkingMinutes} minutos caminando).`,
    )
  }

  if (tips.length > 0) {
    const main = tips[0]
    const block = tri.level === 'Grave' ? [] : [`${main.title}:`]
    main.steps.slice(0, 3).forEach((step, i) => block.push(`${i + 1}. ${step}`))
    parts.push(block.join('\n'))

    const others = tips.slice(1).map((t) => `${t.title} (${t.source})`)
    if (others.length > 0) parts.push(`También te puede servir: ${others.join('; ')}.`)
  }

  if (tri.level === 'Moderado' && tri.emergencyType === 'Medica')
    parts.push('Si los síntomas continúan o empeoran, acude a tu centro de salud.')

  for (const w of zoneWarnings) parts.push(`📍 ${w}`)
  for (const n of notices) parts.push(n.startsWith('📢') ? n : `📢 ${n}`)

  if (parts.length === 0)
    parts.push(`${OFF_TOPIC_REPLY} Si es urgente, llama al SAMU (${SAMU}) o acércate a tu centro de salud.`)

  return parts.join('\n\n').trim()
}

// ---- Entrada pública ----

/**
 * Responde con los datos guardados en el dispositivo.
 * Devuelve null si nunca se descargó el paquete offline: ahí no hay nada honesto que contestar.
 */
export async function answerOffline(
  message: string,
  coords: { latitude: number; longitude: number } | null,
): Promise<PatyReply | null> {
  const pack = await getOfflinePack()
  if (!pack) return null

  const text = normalize(message)
  const ubigeo = pack.ubicacion?.ubigeo ?? pack.distrito?.ubigeo ?? null

  const tri = triage(message, pack.palabrasAlarma ?? [])

  // Consejos: en una emergencia sirve qué hacer AHORA (fase "durante" primero)
  let tips = searchTips(message, pack.consejos ?? [], 6)
  if (tri.level === 'Grave')
    tips = [...tips].sort((a, b) => (a.phase === 'Durante' ? 0 : 1) - (b.phase === 'Durante' ? 0 : 1))
  tips = tips.slice(0, 3)

  // Historial de la zona: las advertencias ya redactadas del paquete, si pregunta por su zona
  const asksZone = ZONE_WORDS.some((w) => containsTerm(text, w))
  const zoneWarnings: string[] = []
  if (asksZone && pack.historial) {
    zoneWarnings.push(...pack.historial.hazards.slice(0, 3).map((h) => h.warning))
    if (pack.historial.hazards.length === 0) zoneWarnings.push(pack.historial.coverage)
  }

  // Alertas vigentes guardadas y el último estado de El Niño del ENFEN
  const notices: string[] = []
  if (asksZone) {
    notices.push(...(pack.alertas ?? []).slice(0, 2).map((a) => `Alerta vigente: ${a.title}. ${a.description}`))
    const enfen = (pack.boletines ?? []).find((b) => b.institution === 'ENFEN')
    if (enfen) notices.push(`Según el ${enfen.title}: ${enfen.alertStatus}. ${enfen.summary}`)
  }

  const wantsCenter = CENTER_WORDS.some((w) => containsTerm(text, w))
  const nearest =
    coords && (wantsCenter || (tri.level !== 'Leve' && tri.emergencyType === 'Medica'))
      ? nearestCenters(pack.centrosSalud ?? [], coords, 3, tri.level === 'Grave')
      : []

  const tipRefs: TipReference[] = tips.map((t) => ({
    id: t.id,
    title: t.title,
    source: t.source,
    steps: t.steps,
    sourceUrl: t.sourceUrl,
  }))

  return {
    reply: buildReply(tri, tips, zoneWarnings, notices, nearest, wantsCenter, ubigeo),
    location: pack.ubicacion
      ? { district: pack.ubicacion.district, province: pack.ubicacion.province, department: pack.ubicacion.department }
      : null,
    triage: {
      level: tri.level,
      emergencyType: tri.emergencyType,
      phoneNumber: tri.phoneNumber,
      phoneLabel: tri.phoneLabel,
    },
    tips: tipRefs,
    zoneWarnings,
    officialNotices: notices,
    nearestCenters: nearest,
    actions: buildActions(tri, wantsCenter, nearest, ubigeo),
    usedAi: false,
  }
}

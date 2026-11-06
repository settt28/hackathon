import knowledgeJson from '../../data/offline/knowledge.json'
import { api, backendAvailable, sendPatyMessage, type PatyReply } from '../api'
import { getLastPosition, getPositionWithin } from '../geo'
import {
  answerOffline,
  newOfflineSession,
  triage,
  type Coords,
  type OfflineCenter,
  type OfflineDistrict,
  type OfflineGeo,
  type OfflineKnowledge,
} from './engine'

/**
 * Decide quién responde a Paty, para que siempre haya respuesta rápida:
 * - Emergencia: al instante en el teléfono, sin esperar a la red ni al GPS.
 * - Sin red o sin backend: en el teléfono.
 * - Con red: el backend (con IA si la tiene). Si no contesta a tiempo, responde el teléfono.
 */

const bundled = knowledgeJson as OfflineKnowledge
const CACHE_KEY = 'paty-knowledge'

/** Solo se acepta si es más reciente que lo que trae la app y no perdió contenido: una lista recortada ocultaría emergencias. */
function isUsable(k: Partial<OfflineKnowledge> | null): k is OfflineKnowledge {
  return (
    !!k?.generatedAt &&
    k.generatedAt > bundled.generatedAt &&
    Array.isArray(k.keywords) &&
    Array.isArray(k.tips) &&
    k.keywords.length >= bundled.keywords.length * 0.8 &&
    k.tips.length >= bundled.tips.length * 0.8
  )
}

function readCached(): OfflineKnowledge {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as Partial<OfflineKnowledge> | null
    return isUsable(cached) ? cached : bundled
  } catch {
    return bundled
  }
}

let knowledge = readCached()
let refreshed = false

/** Con internet, guarda consejos y boletín al día para la próxima vez que no haya conexión. Si falla, sigue lo que había. */
async function refreshKnowledge() {
  if (refreshed || !backendAvailable()) return
  refreshed = true
  try {
    const fresh = await api<Partial<OfflineKnowledge>>('/api/paty/offline', { timeoutMs: 15000 })
    if (!isUsable(fresh)) return
    knowledge = fresh
    localStorage.setItem(CACHE_KEY, JSON.stringify(fresh))
  } catch {
    refreshed = false // se reintenta al volver a abrir el chat
  }
}

/** Tiempo máximo hasta tener respuesta con red. Súbelo si la IA es lenta (ej. Ollama en un portátil). */
const TOTAL_BUDGET_MS = Number(import.meta.env.VITE_PATY_TIMEOUT_MS) || 5000
const GPS_WAIT_ONLINE_MS = 1500
const GPS_WAIT_OFFLINE_MS = 800

let geo: Promise<OfflineGeo | null> | null = null

/** Carga distritos y postas (van dentro del APK). Conviene llamarlo al abrir el chat, para que estén listos. */
/**
 * Memoria de la conversación sin conexión: así Paty no repite frases ni pasos y entiende "¿qué más?" o "sí".
 * Vive solo mientras el chat está abierto (no se guarda en el teléfono).
 */
let conversation = newOfflineSession()

/** Empieza una conversación nueva (al abrir el chat). */
export function resetOfflineConversation() {
  conversation = newOfflineSession()
}

export function preloadOfflineData(): Promise<OfflineGeo | null> {
  void refreshKnowledge()
  const load = async <T,>(file: string) => {
    const res = await fetch(`${import.meta.env.BASE_URL}offline/${file}`)
    if (!res.ok) throw new Error(`No se pudo cargar ${file}`)
    return (await res.json()) as T
  }
  geo ??= Promise.all([load<OfflineDistrict[]>('districts.json'), load<OfflineCenter[]>('centers.json')])
    .then(([districts, centers]) => ({ districts, centers }))
    .catch(() => {
      geo = null // se reintenta en la próxima consulta; mientras, Paty responde sin distrito ni postas
      return null
    })
  return geo
}

async function answerHere(message: string, coords: Coords | null, maxWaitMs = 3000): Promise<PatyReply> {
  // En un celular muy lento los datos pueden tardar: sin ellos, Paty responde igual (sin distrito ni postas)
  const data = await Promise.race([preloadOfflineData(), new Promise<null>((resolve) => setTimeout(() => resolve(null), maxWaitMs))])
  const now = new Date()
  conversation.hour = now.getHours() // "buenos días / tardes / noches" según la hora del teléfono
  return answerOffline(message, knowledge, data, coords, now.getMonth(), conversation)
}

export async function askPaty(message: string, signal?: AbortSignal): Promise<PatyReply> {
  if (triage(message, knowledge).level === 'Grave') return answerHere(message, getLastPosition(), 300)
  if (!backendAvailable()) return answerHere(message, await getPositionWithin(GPS_WAIT_OFFLINE_MS))

  const start = performance.now()
  const coords = await getPositionWithin(GPS_WAIT_ONLINE_MS)
  try {
    const timeoutMs = TOTAL_BUDGET_MS - (performance.now() - start)
    const reply = await sendPatyMessage({ message, ...coords }, signal, timeoutMs)
    // Un portal de Wi-Fi o un proxy pueden devolver otro JSON: sin este control, la pantalla se rompería
    if (typeof reply?.reply !== 'string' || !reply.triage) throw new Error('Respuesta inesperada del servidor')
    return reply
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e // la persona salió del chat
    return answerHere(message, coords)
  }
}

import knowledgeJson from '../../data/offline/knowledge.json'
import { backendAvailable, sendPatyMessage, type PatyReply } from '../api'
import { getLastPosition, getPositionWithin } from '../geo'
import { answerOffline, triage, type Coords, type OfflineCenter, type OfflineDistrict, type OfflineGeo, type OfflineKnowledge } from './engine'

/**
 * Decide quién responde a Paty, para que siempre haya respuesta rápida:
 * - Emergencia: al instante en el teléfono, sin esperar a la red ni al GPS.
 * - Sin red o sin backend: en el teléfono.
 * - Con red: el backend (con IA si la tiene). Si no contesta a tiempo, responde el teléfono.
 */

const knowledge = knowledgeJson as OfflineKnowledge

/** Tiempo máximo hasta tener respuesta con red. Súbelo si la IA es lenta (ej. Ollama en un portátil). */
const TOTAL_BUDGET_MS = Number(import.meta.env.VITE_PATY_TIMEOUT_MS) || 5000
const GPS_WAIT_ONLINE_MS = 1500
const GPS_WAIT_OFFLINE_MS = 800

let geo: Promise<OfflineGeo | null> | null = null

/** Carga distritos y postas (van dentro del APK). Conviene llamarlo al abrir el chat, para que estén listos. */
export function preloadOfflineData(): Promise<OfflineGeo | null> {
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

async function answerHere(message: string, coords: Coords | null): Promise<PatyReply> {
  return answerOffline(message, knowledge, await preloadOfflineData(), coords, new Date().getMonth())
}

export async function askPaty(message: string, signal?: AbortSignal): Promise<PatyReply> {
  if (triage(message, knowledge).level === 'Grave') return answerHere(message, getLastPosition())
  if (!backendAvailable()) return answerHere(message, await getPositionWithin(GPS_WAIT_OFFLINE_MS))

  const start = performance.now()
  const coords = await getPositionWithin(GPS_WAIT_ONLINE_MS)
  try {
    const timeoutMs = TOTAL_BUDGET_MS - (performance.now() - start)
    return await sendPatyMessage({ message, ...coords }, signal, timeoutMs)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e // la persona salió del chat
    return answerHere(message, coords)
  }
}

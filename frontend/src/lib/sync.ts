/**
 * Paquete offline: todo lo que la app necesita para funcionar sin internet en la zona del usuario.
 * Lo sirve el backend en /api/sync (ver ElNino.API/Controllers/SyncController.cs) y aquí se guarda
 * en IndexedDB. Con él, Paty responde, el historial se ve y las postas siguen apareciendo sin señal.
 */
import { api } from './api'
import { idbGet, idbSet } from './idb'
import { getPosition } from './geo'
import { isOnline } from './connection'

const KEY = 'paquete-offline'

/** Se renueva a lo más una vez al día: el paquete pesa MB y los consejos oficiales cambian poco. */
const REFRESH_MS = 24 * 60 * 60 * 1000

// ---- Forma del paquete (coincide con el JSON de SyncController) ----

export interface OfflineTip {
  id: string
  domain: string
  topic: string
  hazard: string
  phase: 'Antes' | 'Durante' | 'Despues'
  title: string
  steps: string[]
  keywords: string[]
  source: string
  sourceUrl: string
}

export interface OfflineKeyword {
  term: string
  level: 'Leve' | 'Moderado' | 'Grave'
  emergencyType: 'Medica' | 'Desastre'
}

export interface OfflineCenter {
  name: string
  type: string
  category: string
  handlesEmergencies: boolean
  latitude: number
  longitude: number
  phone?: string | null
  district: string
}

export interface OfflineBulletin {
  institution: string
  title: string
  publishedAt: string
  alertStatus: string
  summary: string
}

export interface OfflinePack {
  generadoEn: string
  ubicacion: { ubigeo: string; district: string; province: string; department: string } | null
  distrito: { ubigeo: string; name: string; province: string; department: string } | null
  consejos: OfflineTip[]
  palabrasAlarma: OfflineKeyword[]
  centrosSalud: OfflineCenter[]
  alertas: { title: string; description: string; level: string; hazard: string; region: string }[]
  historial: { coverage: string; hazards: { warning: string }[] } | null
  boletines: OfflineBulletin[]
  telefonos: Record<string, string>
}

interface StoredPack {
  pack: OfflinePack
  savedAt: number
}

let memory: StoredPack | null = null

/** El paquete guardado, o null si nunca se pudo descargar uno. */
export async function getOfflinePack(): Promise<OfflinePack | null> {
  memory ??= await idbGet<StoredPack>(KEY)
  return memory?.pack ?? null
}

/** Cuándo se descargó el paquete guardado (para avisar "datos del 3 de marzo"). */
export async function getOfflinePackDate(): Promise<number | null> {
  memory ??= await idbGet<StoredPack>(KEY)
  return memory?.savedAt ?? null
}

/**
 * Descarga el paquete de la zona del usuario si hace falta.
 * No hace nada sin conexión, sin ubicación, o si el que hay es de hoy (salvo `force`).
 */
export async function refreshOfflinePack(force = false): Promise<OfflinePack | null> {
  if (!isOnline()) return getOfflinePack()

  memory ??= await idbGet<StoredPack>(KEY)
  if (!force && memory && Date.now() - memory.savedAt < REFRESH_MS) return memory.pack

  const pos = await getPosition()
  if (!pos) return memory?.pack ?? null

  try {
    const pack = await api<OfflinePack>(`/api/sync?lat=${pos.latitude}&lon=${pos.longitude}`, { timeoutMs: 60000 })
    memory = { pack, savedAt: Date.now() }
    await idbSet(KEY, memory)
    return pack
  } catch {
    // Sin paquete nuevo se sigue con el anterior: nunca se borra lo que ya servía
    return memory?.pack ?? null
  }
}

/**
 * Mantiene el paquete al día: al abrir la app y cada vez que vuelve la conexión.
 * Devuelve cómo dejar de escuchar.
 */
export function startOfflineSync(): () => void {
  const refresh = () => void refreshOfflinePack()
  // Sin prisa: que no compita con la primera pintada ni con el mapa
  const timer = setTimeout(refresh, 3000)
  window.addEventListener('online', refresh)
  return () => {
    clearTimeout(timer)
    window.removeEventListener('online', refresh)
  }
}

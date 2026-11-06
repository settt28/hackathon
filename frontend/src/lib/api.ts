import { Capacitor } from '@capacitor/core'

/**
 * Cliente HTTP único del frontend.
 * En desarrollo, Vite redirige /api al backend (ver vite.config.ts), así no hay URLs fijas ni CORS.
 * En producción se define VITE_API_URL (ej. https://api.midominio.pe) si el backend vive en otro origen.
 */
import { MAP_RADIUS_KM } from './riskGeo'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

/** Dentro del APK no hay proxy de Vite: sin VITE_API_URL no hay backend al que llamar. */
const hasBackend = BASE_URL !== '' || !Capacitor.isNativePlatform()

/** ¿Vale la pena intentar llamar al backend? Si es false, ni se intenta: se evita esperar a una red que no está. */
export const backendAvailable = () => hasBackend && navigator.onLine

export class ApiError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

// AbortSignal.timeout/any no existen en WebViews de Android antiguos (< Chrome 116): respaldo equivalente
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(new DOMException('Tiempo agotado', 'TimeoutError')), ms)
  return ctrl.signal
}

function withTimeout(signal: AbortSignal | null | undefined, ms: number): AbortSignal {
  const timeout = timeoutSignal(ms)
  if (!signal) return timeout
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeout])
  const ctrl = new AbortController()
  for (const s of [signal, timeout]) {
    if (s.aborted) {
      ctrl.abort(s.reason)
      break
    }
    s.addEventListener('abort', () => ctrl.abort(s.reason), { once: true })
  }
  return ctrl.signal
}

export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, signal, ...rest } = init
  let res: Response
  try {
    res = await fetch(BASE_URL + path, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...rest.headers },
      // Corta peticiones colgadas (redes 2G/3G) y respeta la cancelación del llamador
      signal: withTimeout(signal, timeoutMs),
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    if ((e as Error).name === 'TimeoutError') throw new ApiError('La conexión está muy lenta. Intenta de nuevo.')
    throw new ApiError('Sin conexión con el servidor.')
  }
  if (!res.ok) {
    // El backend devuelve el motivo como texto plano en los 400
    const text = await res.text().catch(() => '')
    throw new ApiError(text.length < 200 && text ? text : `Error del servidor (${res.status}).`, res.status)
  }
  return res.json() as Promise<T>
}

/**
 * GET con caché en memoria: las pantallas que piden lo mismo (Inicio y cada módulo) comparten una sola petición
 * y al volver a una pantalla los datos aparecen al instante. Si la petición falla no se guarda, así "Reintentar"
 * vuelve a pedirla. Cancelar desde un componente solo lo desconecta a él; la petición compartida sigue.
 */
const getCache = new Map<string, { at: number; data: Promise<unknown> }>()

function cachedGet<T>(path: string, ttlMs: number, signal?: AbortSignal): Promise<T> {
  let entry = getCache.get(path)
  if (!entry || Date.now() - entry.at > ttlMs) {
    const created: { at: number; data: Promise<unknown> } = { at: Date.now(), data: Promise.resolve() }
    created.data = api<T>(path).catch((e) => {
      if (getCache.get(path) === created) getCache.delete(path)
      throw e
    })
    getCache.set(path, created)
    entry = created
  }
  const data = entry.data as Promise<T>
  if (!signal) return data
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Cancelado', 'AbortError'))
    if (signal.aborted) return onAbort()
    signal.addEventListener('abort', onAbort, { once: true })
    data.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

const MINUTE = 60_000

// ---- Tipos del contrato con el backend (ElNino.Core/Models/ServiceModels.cs) ----

export type TriageLevel = 'Leve' | 'Moderado' | 'Grave'

export interface PatyAction {
  type: 'llamar' | 'ver_zona_segura' | 'ver_centros' | (string & {})
  label: string
  value?: string | null
}

export interface TipReference {
  id: string
  title: string
  source: string
  steps: string[]
  sourceUrl: string
}

export interface NearbyHealthCenter {
  center: { name: string; type: string; phone?: string | null; latitude: number; longitude: number }
  distanceKm: number
  walkingMinutes: number
}

export interface PatyReply {
  reply: string
  location: { district: string; province: string; department: string } | null
  triage: { level: TriageLevel; emergencyType?: 'Medica' | 'Desastre' | null; phoneNumber?: string | null; phoneLabel?: string | null }
  tips: TipReference[]
  zoneWarnings: string[]
  officialNotices: string[]
  nearestCenters: NearbyHealthCenter[]
  actions: PatyAction[]
  usedAi: boolean
  /** Respondió el teléfono, sin backend (ver lib/paty/engine.ts). */
  offline?: boolean
}

export interface PatyRequest {
  message: string
  latitude?: number
  longitude?: number
}

export const sendPatyMessage = (req: PatyRequest, signal?: AbortSignal, timeoutMs = 30000) =>
  api<PatyReply>('/api/paty/chat', { method: 'POST', body: JSON.stringify(req), signal, timeoutMs })

// ---- Alertas y consejos por dominio (ElNino.API/Controllers/DomainControllerBase.cs) ----

/** Segmento de la ruta de cada dominio: /api/{dominio}/alertas. */
export type Dominio = 'salud' | 'agricultura' | 'infraestructura'

export type AlertLevel = 'Bajo' | 'Medio' | 'Alto' | 'Critico'

export interface Alert {
  id: string
  domain: string
  level: AlertLevel
  title: string
  description: string
  region: string
  ubigeo: string
  hazard: string
  source: string
  expiresAt: string | null
}

export interface PreventionTip {
  id: string
  hazard: string
  phase: 'Antes' | 'Durante' | 'Despues'
  title: string
  steps: string[]
  source: string
  sourceUrl: string
}

export interface UserLocation {
  ubigeo: string
  district: string
  province: string
  department: string
  exact: boolean
  distanceKm: number | null
}

// Las alertas cambian durante el día: se reutilizan 1 minuto. Los consejos son fijos: 10 minutos.
export const getAlertas = (dominio: Dominio, signal?: AbortSignal) =>
  cachedGet<Alert[]>(`/api/${dominio}/alertas`, MINUTE, signal)

export const getConsejos = (dominio: Dominio, signal?: AbortSignal) =>
  cachedGet<PreventionTip[]>(`/api/${dominio}/consejos`, 10 * MINUTE, signal)

export const getUbicacion = (lat: number, lon: number) =>
  api<UserLocation>(`/api/ubicacion?lat=${lat}&lon=${lon}`)

// ---- Mapa de riesgo (ElNino.API/Controllers/MapaController.cs → GET /api/mapa/riesgo) ----

type Ring = [number, number][]

export interface RiskDistrict {
  type: 'Feature'
  geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] }
  properties: {
    ubigeo: string
    nombre: string
    nivel: 'bajo' | 'moderado' | 'alto' | 'muy alto'
    color: string
    esTuDistrito: boolean
    peligroPrincipal?: string | null
    probabilidadModelo?: number | null
    emergenciasDesde2010?: number
    razones: string[]
  }
}

export interface RiskMap {
  centro: [number, number]
  tuDistrito: { ubigeo: string; nombre: string; departamento: string } | null
  leyenda: { nivel: string; color: string }[]
  estadoElNino?: string | null
  aviso: string
  actualizarCadaSegundos: number
  features: RiskDistrict[]
}

export const getMapaRiesgo = (lat: number, lon: number, signal?: AbortSignal) =>
  api<RiskMap>(`/api/mapa/riesgo?lat=${lat}&lon=${lon}&radioKm=${MAP_RADIUS_KM}`, { signal, timeoutMs: 30000 })

// ---- Voz e IA (PatyController: /capacidades, /voz, /tts) ----

export interface Capacidades {
  /** Modelo de lenguaje que responde, o null si Paty usa plantillas. */
  ia: string | null
  dictado: boolean
  vozServidor: boolean
}

let capacidades: Promise<Capacidades> | null = null

/** Qué piezas de IA están activas en el servidor (se consulta una vez; si falla, se reintenta luego). */
export function getCapacidades(): Promise<Capacidades> {
  if (!backendAvailable()) return Promise.resolve({ ia: null, dictado: false, vozServidor: false })
  capacidades ??= api<Capacidades>('/api/paty/capacidades', { timeoutMs: 8000 }).catch(() => {
    capacidades = null
    return { ia: null, dictado: false, vozServidor: false }
  })
  return capacidades
}

export async function sendPatyVoice(audio: Blob, coords: { latitude: number; longitude: number } | null, signal?: AbortSignal) {
  if (!backendAvailable()) throw new ApiError('Sin conexión no puedo escuchar audios. Escríbeme tu consulta y te respondo.')
  const form = new FormData()
  form.append('audio', audio, audio.type.includes('mp4') ? 'audio.mp4' : audio.type.includes('ogg') ? 'audio.ogg' : 'audio.webm')
  if (coords) {
    form.append('lat', String(coords.latitude))
    form.append('lon', String(coords.longitude))
  }
  const res = await fetch(BASE_URL + '/api/paty/voz', { method: 'POST', body: form, signal: withTimeout(signal, 45000) })
  if (!res.ok) throw new ApiError((await res.text().catch(() => '')) || `Error del servidor (${res.status}).`, res.status)
  return res.json() as Promise<{ transcripcion: string; respuesta: PatyReply }>
}

/** MP3 generado por el servidor (Fish Audio), o null si no está disponible. */
export async function getTtsAudio(texto: string): Promise<Blob | null> {
  const res = await fetch(BASE_URL + '/api/paty/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
    signal: timeoutSignal(30000),
  }).catch(() => null)
  return res?.ok ? res.blob() : null
}

// ---- Historial de la zona (ZonasController → GET /api/zonas/historial) ----

export interface HistoricalEvent {
  id: string
  district: string
  province: string
  hazard: 'Huaico' | 'Inundacion' | 'LluviaIntensa' | 'Deslizamiento' | 'Dengue' | 'Epidemia' | 'Marejada' | 'Otro'
  sourceEventType: string
  date: string
  severity: 'leve' | 'moderado' | 'fuerte' | string
  description: string
  source: string
}

export interface ZoneHistory {
  ubicacion: { ubigeo: string; district: string; province: string; department: string }
  historial: { coverage: string; events: HistoricalEvent[] }
}

export const getZoneHistory = (lat: number, lon: number, signal?: AbortSignal) =>
  api<ZoneHistory>(`/api/zonas/historial?lat=${lat}&lon=${lon}&limite=60`, { signal })

export const getActiveAlerts = (ubigeo: string, signal?: AbortSignal) =>
  api<Alert[]>(`/api/alertas?ubigeo=${encodeURIComponent(ubigeo)}`, { signal })

// ---- Estadísticas nacionales (EstadisticasController → GET /api/estadisticas) ----

export interface DamageTotals {
  eventos: number
  fallecidos: number
  afectados: number
  viviendasDestruidas: number
}

export interface NationalStats {
  desde: number
  datosHasta: string | null
  fuente: string
  nota: string | null
  total: DamageTotals
  porAnio: { anio: number; resumen: DamageTotals }[]
  porPeligro: { peligro: string; resumen: DamageTotals }[]
  departamentos: { departamento: string; resumen: DamageTotals }[]
}

export const getEstadisticas = (anios = 5, signal?: AbortSignal) =>
  cachedGet<NationalStats>(`/api/estadisticas?anios=${anios}`, 10 * MINUTE, signal)

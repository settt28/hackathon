/**
 * Cliente HTTP único del frontend.
 * En desarrollo, Vite redirige /api al backend (ver vite.config.ts), así no hay URLs fijas ni CORS.
 * En producción se define VITE_API_URL (ej. https://api.midominio.pe) si el backend vive en otro origen.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 15000, signal, ...rest } = init
  // Corta peticiones colgadas (redes 2G/3G) y respeta la cancelación del llamador
  const timeout = AbortSignal.timeout(timeoutMs)
  let res: Response
  try {
    res = await fetch(BASE_URL + path, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...rest.headers },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
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
}

export interface PatyRequest {
  message: string
  latitude?: number
  longitude?: number
}

export const sendPatyMessage = (req: PatyRequest, signal?: AbortSignal) =>
  api<PatyReply>('/api/paty/chat', { method: 'POST', body: JSON.stringify(req), signal, timeoutMs: 30000 })

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

export const getAlertas = (dominio: Dominio, signal?: AbortSignal) =>
  api<Alert[]>(`/api/${dominio}/alertas`, { signal })

export const getConsejos = (dominio: Dominio, signal?: AbortSignal) =>
  api<PreventionTip[]>(`/api/${dominio}/consejos`, { signal })

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
  api<RiskMap>(`/api/mapa/riesgo?lat=${lat}&lon=${lon}&radioKm=15`, { signal, timeoutMs: 30000 })

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
  capacidades ??= api<Capacidades>('/api/paty/capacidades', { timeoutMs: 8000 }).catch(() => {
    capacidades = null
    return { ia: null, dictado: false, vozServidor: false }
  })
  return capacidades
}

export async function sendPatyVoice(audio: Blob, coords: { latitude: number; longitude: number } | null, signal?: AbortSignal) {
  const form = new FormData()
  form.append('audio', audio, audio.type.includes('mp4') ? 'audio.mp4' : audio.type.includes('ogg') ? 'audio.ogg' : 'audio.webm')
  if (coords) {
    form.append('lat', String(coords.latitude))
    form.append('lon', String(coords.longitude))
  }
  const res = await fetch(BASE_URL + '/api/paty/voz', { method: 'POST', body: form, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) })
  if (!res.ok) throw new ApiError((await res.text().catch(() => '')) || `Error del servidor (${res.status}).`, res.status)
  return res.json() as Promise<{ transcripcion: string; respuesta: PatyReply }>
}

/** MP3 generado por el servidor (Fish Audio), o null si no está disponible. */
export async function getTtsAudio(texto: string): Promise<Blob | null> {
  const res = await fetch(BASE_URL + '/api/paty/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null)
  return res?.ok ? res.blob() : null
}

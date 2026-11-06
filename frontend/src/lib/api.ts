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
  triage: { level: TriageLevel; phoneNumber?: string | null; phoneLabel?: string | null }
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

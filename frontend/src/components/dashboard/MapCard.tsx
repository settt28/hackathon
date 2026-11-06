import { useState, type FC } from 'react'
import { MapPin, Minus, Navigation, Plus, RefreshCcw } from 'lucide-react'

interface MapCardProps {
  address: string
  gpsLabel: string
}

const MIN_ZOOM = 0.8
const MAX_ZOOM = 1.6

const zoomButton =
  'flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:border-white/15 dark:bg-[#0d1828]/90 dark:text-white dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/**
 * Tarjeta de ubicación en vivo (mapa simulado con cuadrícula).
 * El zoom solo escala la capa del mapa; el marcador del usuario queda centrado.
 */
const MapCard: FC<MapCardProps> = ({ address, gpsLabel }) => {
  const [zoom, setZoom] = useState(1)
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(1))))

  return (
    <section
      aria-label="Ubicación en vivo"
      className="relative h-52 overflow-hidden rounded-3xl border border-slate-200 bg-[#e9f3fa] shadow-sm dark:border-cyan-400/15 dark:bg-[#0a1524] dark:shadow-none"
    >
      {/* Capa de mapa: cuadrícula + manzanas/calles (zonas de color en modo claro, tenues en oscuro) */}
      <div className="absolute inset-0 transition-transform duration-300" style={{ transform: `scale(${zoom})` }} aria-hidden>
        <div className="absolute inset-0 bg-map-grid" />
        <div className="absolute -left-6 top-14 h-40 w-24 -skew-x-12 bg-amber-200/50 dark:bg-white/[0.04]" />
        <div className="absolute bottom-6 right-6 h-20 w-32 rounded-lg bg-emerald-200/60 dark:bg-white/[0.035]" />
        <div className="absolute inset-y-0 left-[46%] w-3 bg-white/70 dark:bg-slate-300/[0.04]" />
        <div className="absolute inset-x-0 top-[58%] h-3 bg-white/70 dark:bg-slate-300/[0.04]" />
      </div>

      {/* Encabezado: dirección + estado del GPS (franja blanca en modo claro) */}
      <div className="relative flex items-start justify-between gap-2 border-b border-slate-100 bg-white p-4 dark:border-transparent dark:bg-transparent">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-cyan-400/10">
            <MapPin className="h-4 w-4 text-sky-600 dark:text-cyan-300" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.16em] text-sky-600 dark:text-cyan-300">UBICACIÓN EN VIVO</p>
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">{address}</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
          {gpsLabel}
        </span>
      </div>

      {/* Controles de zoom */}
      <div className="absolute right-4 top-[38%] flex flex-col gap-1.5">
        <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(0.2)} disabled={zoom >= MAX_ZOOM} className={zoomButton}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(-0.2)} disabled={zoom <= MIN_ZOOM} className={zoomButton}>
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Marcador del usuario con onda pulsante */}
      <div className="absolute left-1/2 top-[58%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="relative flex h-11 w-11 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-cyan-400/40 motion-safe:animate-pulse-ring" aria-hidden />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] dark:border-white/80 dark:bg-cyan-400 dark:shadow-[0_0_20px_rgba(34,211,238,0.6)]">
            <Navigation className="h-5 w-5 -rotate-45 fill-white text-white" aria-hidden />
          </span>
        </div>
        <span className="mt-1.5 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm dark:bg-[#0d1828]/90 dark:text-white dark:shadow-none">
          Tú estás aquí
        </span>
      </div>

      {/* Recentrar */}
      <button
        type="button"
        onClick={() => setZoom(1)}
        className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-3.5 py-2 text-xs font-semibold text-sky-700 shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-95 dark:border-cyan-400/40 dark:bg-[#0d1828]/90 dark:text-cyan-200 dark:shadow-none dark:hover:bg-cyan-400/10 dark:focus-visible:ring-cyan-400"
      >
        <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
        Centrar ruta
      </button>
    </section>
  )
}

export default MapCard

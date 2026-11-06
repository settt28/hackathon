import { useState, type FC } from 'react'
import { MapPin, Minus, Navigation2, Plus, RefreshCcw } from 'lucide-react'

interface MapCardProps {
  address: string
  gpsLabel: string
}

const MIN_ZOOM = 0.8
const MAX_ZOOM = 1.6

const zoomButton =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:border-white/20 dark:bg-[#070d17]/80 dark:text-white dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/**
 * Tarjeta de ubicación en vivo (mapa simulado con cuadrícula).
 * En modo oscuro es translúcida para dejar ver la silueta del Perú del fondo.
 * El zoom solo escala la capa del mapa; el marcador del usuario queda centrado.
 */
const MapCard: FC<MapCardProps> = ({ address, gpsLabel }) => {
  const [zoom, setZoom] = useState(1)
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(1))))

  return (
    <section
      aria-label="Ubicación en vivo"
      className="relative h-[180px] overflow-hidden rounded-3xl border border-slate-200 bg-[#e9f3fa] shadow-sm dark:border-cyan-400/25 dark:bg-[#0a1524]/60 dark:shadow-none"
    >
      {/* Capa de mapa: cuadrícula (+ zonas de color solo en modo claro) */}
      <div className="absolute inset-0 transition-transform duration-300" style={{ transform: `scale(${zoom})` }} aria-hidden>
        <div className="absolute inset-0 bg-map-grid" />
        <div className="absolute -left-6 top-14 h-40 w-24 -skew-x-12 bg-amber-200/50 dark:hidden" />
        <div className="absolute bottom-6 right-6 h-20 w-32 rounded-lg bg-emerald-200/60 dark:hidden" />
        <div className="absolute inset-y-0 left-[46%] w-3 bg-white/70 dark:hidden" />
        <div className="absolute inset-x-0 top-[58%] h-3 bg-white/70 dark:hidden" />
      </div>

      {/* Encabezado: dirección + estado del GPS (franja blanca en modo claro) */}
      <div className="relative flex items-start justify-between gap-2 border-b border-slate-100 bg-white px-3.5 pb-2 pt-3.5 dark:border-transparent dark:bg-transparent">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-transparent">
            <MapPin className="h-4 w-4 text-sky-600 dark:text-cyan-300" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.14em] text-sky-600 dark:text-cyan-300">UBICACIÓN EN VIVO</p>
            <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-white">{address}</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
          {gpsLabel}
        </span>
      </div>

      {/* Controles de zoom */}
      <div className="absolute right-3 top-[70px] flex flex-col gap-2">
        <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(0.2)} disabled={zoom >= MAX_ZOOM} className={zoomButton}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(-0.2)} disabled={zoom <= MIN_ZOOM} className={zoomButton}>
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Marcador del usuario: el círculo queda en el centro exacto de la tarjeta; la etiqueta va debajo */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute -inset-4 rounded-full bg-cyan-400/15" aria-hidden />
          <span className="absolute inset-0 rounded-full bg-cyan-400/40 motion-safe:animate-pulse-ring" aria-hidden />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] dark:border-cyan-100 dark:bg-cyan-400 dark:shadow-[0_0_20px_rgba(34,211,238,0.6)]">
            <Navigation2 className="h-5 w-5 fill-white text-white" aria-hidden />
          </span>
        </div>
        <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 shadow-sm dark:bg-transparent dark:text-white dark:shadow-none">
          Tú estás aquí
        </span>
      </div>

      {/* Recentrar */}
      <button
        type="button"
        onClick={() => setZoom(1)}
        className="absolute bottom-3 left-4 flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-[13px] font-semibold text-sky-700 shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-95 dark:border-cyan-400/40 dark:bg-[#070d17]/80 dark:text-white dark:shadow-none dark:hover:bg-cyan-400/10 dark:focus-visible:ring-cyan-400"
      >
        <RefreshCcw className="h-4 w-4 dark:text-cyan-300" aria-hidden />
        Centrar ruta
      </button>
    </section>
  )
}

export default MapCard

import { useState, type FC } from 'react'
import { LocateFixed, Minus, Navigation2, Plus } from 'lucide-react'
import { DISTRICTS, MAP_VIEWBOX, RISK_STYLES, USER_POSITION, centroid, type District } from './districts'

interface RiskMapProps {
  selectedId: string
  onSelect: (district: District) => void
  /** Vuelve a la ubicación del usuario (selecciona su distrito). */
  onLocate: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 2

const controlButton =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:border-white/15 dark:bg-[#070d17]/90 dark:text-white dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/** Convierte una coordenada del mapa a porcentaje del contenedor (para posicionar HTML encima del SVG). */
const toPercent = ([x, y]: [number, number]) => ({
  left: `${((x - MAP_VIEWBOX.x) / MAP_VIEWBOX.width) * 100}%`,
  top: `${((y - MAP_VIEWBOX.y) / MAP_VIEWBOX.height) * 100}%`,
})

/**
 * Mapa de riesgo por distritos (SVG). Cada distrito se puede tocar para ver su detalle.
 * El zoom escala el mapa tomando como centro la posición del usuario.
 */
const RiskMap: FC<RiskMapProps> = ({ selectedId, onSelect, onLocate }) => {
  const [zoom, setZoom] = useState(1)
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))))
  const selected = DISTRICTS.find((d) => d.id === selectedId)
  const [labelX, labelY] = selected ? centroid(selected.points) : [0, 0]
  const userPos = toPercent(USER_POSITION)

  return (
    <div className="relative aspect-[710/680] w-full overflow-hidden rounded-3xl border border-slate-200 bg-[#e9f3fa] dark:border-cyan-400/25 dark:bg-[#0a1524]">
      <div className="absolute inset-0 bg-map-grid" aria-hidden />

      {/* Capa escalable: polígonos + marcador + etiqueta */}
      <div
        className="absolute inset-0 transition-transform duration-300"
        style={{ transform: `scale(${zoom})`, transformOrigin: `${userPos.left} ${userPos.top}` }}
      >
        <svg
          viewBox={`${MAP_VIEWBOX.x} ${MAP_VIEWBOX.y} ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="group"
          aria-label="Distritos por nivel de riesgo"
        >
          {/* El seleccionado se dibuja al final para que su borde quede encima */}
          {[...DISTRICTS].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)).map((d) => {
            const style = RISK_STYLES[d.risk]
            const isSelected = d.id === selectedId
            return (
              <polygon
                key={d.id}
                points={d.points.map((p) => p.join(',')).join(' ')}
                fill={isSelected ? style.stroke : style.fill}
                fillOpacity={isSelected ? 0.5 : 1}
                stroke={isSelected ? '#fde047' : style.stroke}
                strokeWidth={isSelected ? 5 : 2.5}
                strokeLinejoin="round"
                tabIndex={0}
                role="button"
                aria-label={`${d.name}: riesgo ${style.label.toLowerCase()}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(d)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(d))}
                className="cursor-pointer outline-none transition-[fill-opacity] hover:brightness-125 focus-visible:brightness-125"
              />
            )
          })}
        </svg>

        {/* Marcador del usuario */}
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={userPos} aria-hidden>
          <div className="relative flex h-11 w-11 items-center justify-center">
            <span className="absolute -inset-4 rounded-full bg-cyan-400/20" />
            <span className="absolute inset-0 rounded-full bg-cyan-400/40 motion-safe:animate-pulse-ring" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-cyan-100 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]">
              <Navigation2 className="h-5 w-5 fill-white text-white" />
            </span>
          </div>
        </div>

        {/* Etiqueta del distrito seleccionado */}
        {selected && (
          <span
            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-yellow-300 bg-[#1a1503] px-3 py-1 text-xs font-bold text-yellow-300"
            style={toPercent([labelX + 50, labelY + 60])}
          >
            {selected.name}
          </span>
        )}
      </div>

      {/* Controles: acercar, alejar y volver a mi ubicación */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(0.25)} disabled={zoom >= MAX_ZOOM} className={controlButton}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(-0.25)} disabled={zoom <= MIN_ZOOM} className={controlButton}>
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Ir a mi ubicación"
          onClick={() => {
            setZoom(1)
            onLocate()
          }}
          className={`${controlButton} !border-cyan-400/50 !text-cyan-500 dark:!text-cyan-300`}
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default RiskMap

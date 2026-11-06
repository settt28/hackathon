import { useMemo, useRef, useState, type FC } from 'react'
import clsx from 'clsx'
import { LocateFixed, Maximize2, Minimize2, Minus, Navigation2, Plus } from 'lucide-react'
import type { RiskMap as RiskMapData } from '../../lib/api'
import { useTheme } from '../../hooks/useTheme'
import { projectRiskMap } from '../../lib/riskGeo'
import { useElementSize } from '../../hooks/useElementSize'
import { BaseMapTiles, DistrictLabels, MapAttribution } from './MapLayers'

interface RiskMapProps {
  map: RiskMapData
  selected: string
  onSelect: (ubigeo: string) => void
  /** Vuelve a la ubicación del usuario (selecciona su distrito). */
  onLocate: () => void
  /** Mapa agrandado: ocupa todo el alto disponible en lugar de ser cuadrado. */
  expanded: boolean
  onToggleExpanded: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3

const controlButton =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:border-white/15 dark:bg-[#070d17]/90 dark:text-white dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/**
 * Mapa de riesgo grande (pop-up): 20 km alrededor del usuario sobre el mapa base (costa, ríos, calles), con los
 * distritos reales y sus nombres; cada uno se puede tocar para ver su detalle. El zoom escala desde el centro,
 * donde está el usuario, y al acercar aparecen más nombres.
 */
const RiskMap: FC<RiskMapProps> = ({ map, selected, onSelect, onLocate, expanded, onToggleExpanded }) => {
  const [zoom, setZoom] = useState(1)
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)))
  const geo = useMemo(() => projectRiskMap(map), [map])
  const boxRef = useRef<HTMLDivElement>(null)
  const { width, height } = useElementSize(boxRef)
  const { isDark } = useTheme()
  // El seleccionado se dibuja al final para que su borde quede encima
  const paths = [...geo.paths].sort((a, b) => Number(a.f.properties.ubigeo === selected) - Number(b.f.properties.ubigeo === selected))

  return (
    <div
      ref={boxRef}
      className={clsx(
        'relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-[#e9f3fa] dark:border-cyan-400/25 dark:bg-[#0a1524]',
        expanded ? 'h-full' : 'aspect-square',
      )}
    >
      <div className="absolute inset-0 bg-map-grid" aria-hidden />
      <BaseMapTiles geo={geo} width={width} height={height} zoom={zoom} dark={isDark} fit={expanded} />

      <svg
        viewBox={geo.viewBox}
        // Agrandado, el área completa entra en pantalla (y se ve más alrededor); recortarla escondería distritos
        preserveAspectRatio={expanded ? 'xMidYMid meet' : 'xMidYMid slice'}
        className="absolute inset-0 h-full w-full transition-transform duration-300"
        style={{ transform: `scale(${zoom})` }}
        role="group"
        aria-label="Distritos por nivel de riesgo"
      >
        {paths.map(({ f, d }) => {
          const isSelected = f.properties.ubigeo === selected
          return (
            <path
              key={f.properties.ubigeo}
              d={d}
              fill={f.properties.color}
              fillOpacity={isSelected ? 0.65 : 0.3}
              stroke={isSelected ? '#fde047' : f.properties.color}
              strokeWidth={isSelected ? 3 : 1.2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              tabIndex={0}
              role="button"
              aria-label={`${f.properties.nombre}: riesgo ${f.properties.nivel}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(f.properties.ubigeo)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(f.properties.ubigeo))}
              className="cursor-pointer outline-none transition-[fill-opacity] hover:brightness-125 focus-visible:brightness-125"
            />
          )
        })}
        <DistrictLabels geo={geo} width={width} height={height} zoom={zoom} highlight={selected} fit={expanded} />
      </svg>

      <MapAttribution className="bottom-2.5 right-3" />

      {/* Marcador del usuario: el viewBox está centrado en él */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <div className="relative flex h-11 w-11 items-center justify-center">
          <span className="absolute -inset-4 rounded-full bg-cyan-400/20" />
          <span className="absolute inset-0 rounded-full bg-cyan-400/40 motion-safe:animate-pulse-ring" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-cyan-100 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]">
            <Navigation2 className="h-5 w-5 fill-white text-white" />
          </span>
        </div>
      </div>

      {/* Controles: agrandar o reducir el mapa, acercar, alejar y volver a mi ubicación */}
      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button
          type="button"
          aria-label={expanded ? 'Reducir mapa' : 'Agrandar mapa'}
          aria-pressed={expanded}
          onClick={onToggleExpanded}
          className={`${controlButton} !border-cyan-400/50 !text-cyan-500 dark:!text-cyan-300`}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(0.5)} disabled={zoom >= MAX_ZOOM} className={controlButton}>
          <Plus className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(-0.5)} disabled={zoom <= MIN_ZOOM} className={controlButton}>
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

import { useMemo, useRef, useState, type FC } from 'react'
import { ChevronRight, MapPin, Maximize2, Minus, Navigation2, Plus, RefreshCcw } from 'lucide-react'
import clsx from 'clsx'
import type { RiskMapState } from '../../hooks/useRiskMap'
import { useTheme } from '../../hooks/useTheme'
import { projectRiskMap } from '../../lib/riskGeo'
import { useElementSize } from '../../hooks/useElementSize'
import { BaseMapTiles, DistrictLabels, MapAttribution } from '../riskmap/MapLayers'

const MIN_ZOOM = 1
const MAX_ZOOM = 3

const zoomButton =
  'flex h-7 w-7 @5xl:h-10 @5xl:w-10 @5xl:rounded-lg items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:border-white/15 dark:bg-[#0d1828]/90 dark:text-white dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/**
 * Tarjeta de ubicación en vivo: 20 km alrededor del usuario, con el mapa base (costa, ríos, calles) y los distritos
 * coloreados por nivel de riesgo estimado, con sus nombres donde caben.
 * Tocar el mapa (o el botón de expandir) abre el detalle a pantalla completa (RiskMapSheet).
 * En modo oscuro es translúcida para dejar ver la silueta del Perú del fondo.
 */
const MapCard: FC<{ state: RiskMapState; retry: () => void; onExpand: () => void }> = ({ state, retry, onExpand }) => {
  const [zoom, setZoom] = useState(1)
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)))

  const map = state.kind === 'ok' ? state.map : null
  const geo = useMemo(() => (map && map.features.length ? projectRiskMap(map) : null), [map])
  const mine = map?.features.find((f) => f.properties.esTuDistrito) ?? null
  const sectionRef = useRef<HTMLElement>(null)
  const { width, height } = useElementSize(sectionRef)
  const { isDark } = useTheme()

  return (
    <section
      ref={sectionRef}
      aria-label="Mapa de riesgo de tu zona"
      // Tablet/PC: llena el alto de la grilla del inicio (mín. 30rem; en tablet vertical, máx. 44rem para no quedar angosto y altísimo)
      className="relative h-80 overflow-hidden rounded-3xl @3xl:h-auto @3xl:max-h-[44rem] @3xl:min-h-[30rem] @3xl:flex-1 @5xl:max-h-none @5xl:min-h-[34rem] border border-slate-200 bg-[#e9f3fa] shadow-sm dark:border-cyan-400/25 dark:bg-[#0a1524]/60 dark:shadow-none"
    >
      <div className="absolute inset-0 bg-map-grid" aria-hidden />

      {/* Mapa base real debajo de los distritos (mismo zoom y centro) */}
      {geo && <BaseMapTiles geo={geo} width={width} height={height} zoom={zoom} dark={isDark} />}

      {/* Capa del mapa: el zoom escala alrededor del centro, donde está el usuario */}
      {geo && (
        <svg
          viewBox={geo.viewBox}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full cursor-zoom-in transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
          onClick={onExpand}
          role="img"
          aria-label={`Distritos cercanos coloreados por nivel de riesgo${mine ? `. Tu distrito, ${mine.properties.nombre}: riesgo ${mine.properties.nivel}` : ''}`}
        >
          {geo.paths.map(({ f, d }) => (
            <path
              key={f.properties.ubigeo}
              d={d}
              fill={f.properties.color}
              fillOpacity={f.properties.esTuDistrito ? 0.6 : 0.32}
              stroke={f.properties.esTuDistrito ? 'currentColor' : f.properties.color}
              strokeWidth={f.properties.esTuDistrito ? 2.5 : 1}
              vectorEffect="non-scaling-stroke"
              className="text-slate-900 dark:text-white"
            >
              <title>{`${f.properties.nombre}: riesgo ${f.properties.nivel}`}</title>
            </path>
          ))}
          <DistrictLabels geo={geo} width={width} height={height} zoom={zoom} />
        </svg>
      )}

      {/* Encabezado: distrito + nivel de riesgo */}
      <div className="relative flex items-start justify-between gap-2 border-b border-slate-100 bg-white/95 p-4 @5xl:px-6 @5xl:py-5 backdrop-blur dark:border-transparent dark:bg-[#0a1524]/70">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 @5xl:h-11 @5xl:w-11 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-cyan-400/10">
            <MapPin className="h-4 w-4 @5xl:h-5 @5xl:w-5 text-sky-600 dark:text-cyan-300" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] @5xl:text-[11px] font-bold tracking-[0.16em] text-sky-600 dark:text-cyan-300">RIESGO EN TU ZONA</p>
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white @5xl:text-lg">
              {map?.tuDistrito
                ? `${map.tuDistrito.nombre}, ${map.tuDistrito.departamento}`
                : state.kind === 'loading'
                  ? 'Buscando tu ubicación…'
                  : 'Ubicación no disponible'}
            </p>
          </div>
        </div>
        {mine && (
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/40 px-2.5 py-1 text-[10px] font-bold uppercase @5xl:px-4 @5xl:py-1.5 @5xl:text-xs text-white shadow-sm"
            style={{ backgroundColor: mine.properties.color }}
          >
            Riesgo {mine.properties.nivel}
          </span>
        )}
      </div>

      {/* Estados sin mapa */}
      {state.kind !== 'ok' && (
        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/4 flex-col items-center gap-2 text-center text-xs text-slate-600 dark:text-slate-300">
          {state.kind === 'loading' && <p>Cargando mapa de riesgo…</p>}
          {state.kind === 'no-gps' && <p>Activa tu ubicación para ver el riesgo de tu zona.</p>}
          {state.kind === 'error' && <p>No pudimos cargar el mapa. {state.message}</p>}
          {state.kind !== 'loading' && (
            <button type="button" onClick={retry} className="rounded-full border border-sky-200 bg-white px-3.5 py-1.5 font-semibold text-sky-700 dark:border-cyan-400/40 dark:bg-[#0d1828] dark:text-cyan-200">
              Reintentar
            </button>
          )}
        </div>
      )}

      {geo && (
        <>
          {/* Marcador del usuario: el viewBox está centrado en él, así que va fijo al centro (también con zoom) */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute -inset-3 rounded-full bg-cyan-400/15" aria-hidden />
              <span className="absolute inset-0 rounded-full bg-cyan-400/40 motion-safe:animate-pulse-ring" aria-hidden />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] dark:border-cyan-100 dark:bg-cyan-400">
                <Navigation2 className="h-4 w-4 fill-white text-white" aria-hidden />
              </span>
            </div>
          </div>

          {/* Zoom */}
          <div className="absolute right-4 top-[30%] flex flex-col gap-1.5 @5xl:right-6 @5xl:top-[24%] @5xl:gap-2">
            <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(0.5)} disabled={zoom >= MAX_ZOOM} className={zoomButton}>
              <Plus className="h-4 w-4 @5xl:h-5 @5xl:w-5" />
            </button>
            <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(-0.5)} disabled={zoom <= MIN_ZOOM} className={zoomButton}>
              <Minus className="h-4 w-4 @5xl:h-5 @5xl:w-5" />
            </button>
            {zoom !== 1 && (
              <button type="button" aria-label="Centrar mapa" onClick={() => setZoom(1)} className={zoomButton}>
                <RefreshCcw className="h-3.5 w-3.5 @5xl:h-4 @5xl:w-4" />
              </button>
            )}
            <button
              type="button"
              aria-label="Ver mapa de riesgo en pantalla completa"
              onClick={onExpand}
              className={clsx(zoomButton, '!border-cyan-400/50 !text-cyan-600 dark:!text-cyan-300')}
            >
              <Maximize2 className="h-3.5 w-3.5 @5xl:h-4 @5xl:w-4" />
            </button>
          </div>

          <MapAttribution className="bottom-[4.1rem] right-4 @5xl:bottom-[6.4rem] @5xl:right-6" />

          {/* Leyenda */}
          <ul className="absolute left-4 top-[30%] space-y-1 rounded-lg bg-white/85 px-2 py-1.5 text-[9px] @5xl:left-6 @5xl:top-[24%] @5xl:space-y-1.5 @5xl:rounded-xl @5xl:px-3 @5xl:py-2.5 @5xl:text-xs font-semibold capitalize text-slate-700 backdrop-blur dark:bg-[#0d1828]/80 dark:text-slate-200" aria-label="Leyenda de riesgo">
            {map!.leyenda.map((l) => (
              <li key={l.nivel} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full @5xl:h-2.5 @5xl:w-2.5" style={{ backgroundColor: l.color }} aria-hidden />
                {l.nivel}
              </li>
            ))}
          </ul>

          {/* Resumen corto (siempre completo); el detalle con los motivos se abre a pantalla completa */}
          <button
            type="button"
            onClick={onExpand}
            className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2.5 text-left text-xs @5xl:inset-x-5 @5xl:bottom-5 @5xl:px-5 @5xl:py-4 @5xl:text-base shadow-sm backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-cyan-400/20 dark:bg-[#0d1828]/90 dark:hover:bg-[#0d1828]"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-slate-900 dark:text-white">
                {mine ? `${mine.properties.nombre}: riesgo ${mine.properties.nivel} este mes` : 'Distritos cercanos'}
              </span>
              <span className="block truncate text-slate-500 dark:text-slate-400">
                {mine?.properties.peligroPrincipal ? `Peligro principal: ${mine.properties.peligroPrincipal} · ` : ''}Toca para ver el detalle
              </span>
            </span>
            <ChevronRight className="h-4 w-4 @5xl:h-5 @5xl:w-5 shrink-0 text-sky-600 dark:text-cyan-300" aria-hidden />
          </button>
        </>
      )}
    </section>
  )
}

export default MapCard

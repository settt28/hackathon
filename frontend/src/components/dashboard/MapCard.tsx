import { useMemo, useState, type FC } from 'react'
import { MapPin, Minus, Navigation2, Plus, RefreshCcw, X } from 'lucide-react'
import clsx from 'clsx'
import type { RiskDistrict, RiskMap } from '../../lib/api'
import type { RiskMapState } from '../../hooks/useRiskMap'

const MIN_ZOOM = 1
const MAX_ZOOM = 3

const zoomButton =
  'flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:border-white/15 dark:bg-[#0d1828]/90 dark:text-white dark:shadow-none dark:hover:border-cyan-400/50 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/** Polígonos de cada distrito, sin importar si vienen como Polygon o MultiPolygon. */
const polygonsOf = (f: RiskDistrict) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)

/**
 * Proyección equirectangular corregida por la latitud, con origen en el usuario: a la escala de unos
 * pocos distritos es indistinguible de la de un mapa web y no necesita librerías.
 * El viewBox queda centrado en el usuario, así el marcador fijo en el centro de la tarjeta cae sobre su posición.
 */
function project(map: RiskMap) {
  const [lon0, lat0] = map.centro
  const k = Math.cos((lat0 * Math.PI) / 180)
  const x = (lon: number) => (lon - lon0) * k
  const y = (lat: number) => lat0 - lat
  const all = map.features.flatMap((f) => polygonsOf(f).flat(2))
  const hw = Math.max(...all.map((p) => Math.abs(x(p[0]))))
  const hh = Math.max(...all.map((p) => Math.abs(y(p[1]))))
  const pt = ([lon, lat]: [number, number]) => `${x(lon).toFixed(5)},${y(lat).toFixed(5)}`

  return {
    viewBox: `${-hw} ${-hh} ${2 * hw} ${2 * hh}`,
    paths: map.features.map((f) => ({
      f,
      d: polygonsOf(f)
        .flatMap((poly) => poly.map((ring) => `M${ring.map(pt).join('L')}Z`))
        .join(''),
    })),
  }
}

/**
 * Tarjeta de ubicación en vivo: distritos alrededor del usuario coloreados por nivel de riesgo estimado.
 * En modo oscuro es translúcida para dejar ver la silueta del Perú del fondo.
 */
const MapCard: FC<{ state: RiskMapState; retry: () => void }> = ({ state, retry }) => {
  const [zoom, setZoom] = useState(1)
  const [selected, setSelected] = useState<RiskDistrict | null>(null)
  const changeZoom = (delta: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta)))

  const map = state.kind === 'ok' ? state.map : null
  const geo = useMemo(() => (map && map.features.length ? project(map) : null), [map])
  const mine = map?.features.find((f) => f.properties.esTuDistrito) ?? null
  const shown = selected ?? mine

  return (
    <section
      aria-label="Mapa de riesgo de tu zona"
      className="relative h-80 overflow-hidden rounded-3xl border border-slate-200 bg-[#e9f3fa] shadow-sm dark:border-cyan-400/25 dark:bg-[#0a1524]/60 dark:shadow-none"
    >
      <div className="absolute inset-0 bg-map-grid" aria-hidden />

      {/* Capa del mapa: el zoom escala alrededor del centro, donde está el usuario */}
      {geo && (
        <svg
          viewBox={geo.viewBox}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
          role="img"
          aria-label={`Distritos cercanos coloreados por nivel de riesgo${mine ? `. Tu distrito, ${mine.properties.nombre}: riesgo ${mine.properties.nivel}` : ''}`}
        >
          {geo.paths.map(({ f, d }) => (
            <path
              key={f.properties.ubigeo}
              d={d}
              fill={f.properties.color}
              fillOpacity={f === shown ? 0.6 : 0.32}
              stroke={f.properties.esTuDistrito ? 'currentColor' : f.properties.color}
              strokeWidth={f.properties.esTuDistrito || f === selected ? 2.5 : 1}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer text-slate-900 transition-[fill-opacity] dark:text-white"
              onClick={() => setSelected((s) => (s === f ? null : f))}
            >
              <title>{`${f.properties.nombre}: riesgo ${f.properties.nivel}`}</title>
            </path>
          ))}
        </svg>
      )}

      {/* Encabezado: distrito + nivel de riesgo */}
      <div className="relative flex items-start justify-between gap-2 border-b border-slate-100 bg-white/95 p-4 backdrop-blur dark:border-transparent dark:bg-[#0a1524]/70">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-cyan-400/10">
            <MapPin className="h-4 w-4 text-sky-600 dark:text-cyan-300" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold tracking-[0.16em] text-sky-600 dark:text-cyan-300">RIESGO EN TU ZONA</p>
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white">
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
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/40 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-sm"
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
          <div className="absolute right-4 top-[30%] flex flex-col gap-1.5">
            <button type="button" aria-label="Acercar mapa" onClick={() => changeZoom(0.5)} disabled={zoom >= MAX_ZOOM} className={zoomButton}>
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Alejar mapa" onClick={() => changeZoom(-0.5)} disabled={zoom <= MIN_ZOOM} className={zoomButton}>
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* Leyenda */}
          <ul className="absolute left-4 top-[30%] space-y-1 rounded-lg bg-white/85 px-2 py-1.5 text-[9px] font-semibold capitalize text-slate-700 backdrop-blur dark:bg-[#0d1828]/80 dark:text-slate-200" aria-label="Leyenda de riesgo">
            {map!.leyenda.map((l) => (
              <li key={l.nivel} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
                {l.nivel}
              </li>
            ))}
          </ul>

          {/* Detalle del distrito tocado (o el propio): por qué tiene ese nivel */}
          <div className="absolute inset-x-3 bottom-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2.5 text-[11px] shadow-sm backdrop-blur dark:border-cyan-400/20 dark:bg-[#0d1828]/90">
            {shown ? (
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {shown.properties.nombre}
                  {shown.properties.peligroPrincipal && (
                    <span className="font-normal text-slate-500 dark:text-slate-400"> · peligro principal: {shown.properties.peligroPrincipal}</span>
                  )}
                </p>
                <p className="mt-0.5 line-clamp-2 text-slate-600 dark:text-slate-300">{shown.properties.razones[0] ?? map!.aviso}</p>
              </div>
            ) : (
              <p className="flex-1 text-slate-600 dark:text-slate-300">Toca un distrito para ver su nivel de riesgo.</p>
            )}
            {selected ? (
              <button type="button" aria-label="Volver a mi distrito" onClick={() => setSelected(null)} className="shrink-0 rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              zoom !== 1 && (
                <button type="button" aria-label="Centrar mapa" onClick={() => setZoom(1)} className={clsx(zoomButton, 'shrink-0')}>
                  <RefreshCcw className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default MapCard

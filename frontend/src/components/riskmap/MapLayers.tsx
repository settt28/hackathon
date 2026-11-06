import clsx from 'clsx'
import { pxPerUnit, TILE_PX, WORLD_ZOOM, type Projection } from '../../lib/riskGeo'

/** El mapa base de Esri llega con detalle hasta el nivel 16. */
const MAX_TILE_ZOOM = 16

/**
 * Nivel de mosaico para que cada píxel del mosaico mida como mucho un píxel físico de la pantalla
 * (en pantallas retina se pide un nivel más, así calles y costa se ven nítidas).
 */
const tileZoomFor = (px: number) => {
  const dpr = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1)
  return Math.min(MAX_TILE_ZOOM, Math.max(3, Math.ceil(WORLD_ZOOM + Math.log2(px * dpr) - 0.15)))
}

/** Mosaicos que cubren lo visible: con el zoom de los botones se ve el centro, `k` veces más cerca. */
function tilesFor(geo: Projection, width: number, height: number, s: number, k: number) {
  const z = tileZoomFor(s * k)
  const tileUnits = TILE_PX * 2 ** (WORLD_ZOOM - z)
  const [ox, oy] = geo.origin
  const hx = width / (2 * s * k)
  const hy = height / (2 * s * k)
  const x0 = Math.floor((ox - hx) / tileUnits)
  const x1 = Math.floor((ox + hx) / tileUnits)
  const y0 = Math.floor((oy - hy) / tileUnits)
  const y1 = Math.floor((oy + hy) / tileUnits)
  const tiles: { key: string; z: number; x: number; y: number; left: number; top: number; size: number }[] = []
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      tiles.push({
        key: `${z}/${x}/${y}`,
        z,
        x,
        y,
        left: width / 2 + (x * tileUnits - ox) * s,
        top: height / 2 + (y * tileUnits - oy) * s,
        size: tileUnits * s,
      })
  return tiles
}

const MAX_TILES = 64

/**
 * Mapa base gris y sin textos de Esri (World Dark Gray Base): calles, costa, ríos y relieve. No pide clave.
 * Se usa el mismo en ambos temas (en el claro se invierte): así el caché del navegador sirve al cambiar de tema.
 */
const tileUrl = (z: number, x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`

/**
 * Mapa base: calles, costa, ríos y relieve debajo de los distritos, para ubicarse mejor (sin llegar a un Google Maps).
 * Se funde con el fondo de la tarjeta (`screen` en modo oscuro, `multiply` en claro): conserva los colores de la app
 * y solo agrega el trazado urbano. Sin internet los mosaicos no cargan y queda la cuadrícula de siempre.
 * Con zoom se suma una capa más nítida encima de la base, que se mantiene mientras carga.
 */
export function BaseMapTiles({ geo, width, height, zoom, dark }: { geo: Projection; width: number; height: number; zoom: number; dark: boolean }) {
  if (!width || !height) return null
  const s = pxPerUnit(geo, width, height)
  const layers = [tilesFor(geo, width, height, s, 1)]
  if (zoom > 1) {
    const detail = tilesFor(geo, width, height, s, zoom)
    if (detail[0]?.z !== layers[0][0]?.z) layers.push(detail)
  }

  return (
    <div
      className={clsx(
        'pointer-events-none absolute inset-0 transition-transform duration-300',
        // Oscuro: el gris de fondo se lleva a negro (desaparece con `screen`) y las calles quedan como líneas claras
        // sobre el azul. Claro: invertido, el fondo queda blanco (desaparece con `multiply`) y calles y relieve en gris.
        dark
          ? 'opacity-40 mix-blend-screen [filter:brightness(1.6)_contrast(4)]'
          : 'opacity-70 mix-blend-multiply [filter:invert(1)_contrast(2.2)]',
      )}
      style={{ transform: `scale(${zoom})` }}
      aria-hidden
    >
      {layers.map((tiles) =>
        tiles.length > MAX_TILES
          ? null
          : tiles.map((t) => (
              <img
                key={t.key}
                src={tileUrl(t.z, t.x, t.y)}
                alt=""
                draggable={false}
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                className="absolute max-w-none select-none"
                // +0.5 px: evita líneas finas entre mosaicos al escalar
                style={{ left: t.left, top: t.top, width: t.size + 0.5, height: t.size + 0.5 }}
              />
            )),
      )}
    </div>
  )
}

/** Créditos que exige el proveedor del mapa base (Esri y sus fuentes, entre ellas OpenStreetMap). */
export function MapAttribution({ className }: { className?: string }) {
  return (
    <span className={clsx('pointer-events-none absolute text-[8px] leading-none text-slate-500/80 dark:text-slate-400/70', className)}>
      Esri, HERE, Garmin, © OpenStreetMap
    </span>
  )
}

const LABEL_PX = 9

/**
 * Nombres de los distritos dentro del SVG. Solo aparecen donde caben sin chocar (primero el tuyo y los más grandes),
 * así al acercar el mapa se van mostrando más. El tamaño de letra es fijo en pantalla aunque se use el zoom.
 */
export function DistrictLabels({ geo, width, height, zoom, highlight }: { geo: Projection; width: number; height: number; zoom: number; highlight?: string }) {
  if (!width || !height) return null
  const k = pxPerUnit(geo, width, height) * zoom // px de pantalla por unidad
  const visibleHalfX = width / (2 * k)
  const visibleHalfY = height / (2 * k)
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = []

  const candidates = [...geo.paths]
    .filter(({ label }) => Math.abs(label.x) < visibleHalfX && Math.abs(label.y) < visibleHalfY)
    .sort((a, b) => {
      const pa = a.f.properties.esTuDistrito || a.f.properties.ubigeo === highlight ? 1 : 0
      const pb = b.f.properties.esTuDistrito || b.f.properties.ubigeo === highlight ? 1 : 0
      return pb - pa || b.label.w * b.label.h - a.label.w * a.label.h
    })

  const shown = candidates.filter(({ f, label }) => {
    const text = f.properties.nombre
    const wPx = text.length * LABEL_PX * 0.68 + 6
    const hPx = LABEL_PX + 4
    const important = f.properties.esTuDistrito || f.properties.ubigeo === highlight
    // Que el nombre quepa (más o menos) dentro de su distrito, salvo el tuyo
    if (!important && (label.w * k < wPx * 0.8 || label.h * k < hPx)) return false
    const cx = label.x * k
    const cy = label.y * k
    const box = { x0: cx - wPx / 2, y0: cy - hPx / 2, x1: cx + wPx / 2, y1: cy + hPx / 2 }
    if (placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) return false
    placed.push(box)
    return true
  })

  const font = LABEL_PX / k
  return (
    <g className="pointer-events-none select-none" aria-hidden>
      {shown.map(({ f, label }) => {
        const important = f.properties.esTuDistrito || f.properties.ubigeo === highlight
        return (
          <text
            key={f.properties.ubigeo}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={font}
            fontWeight={important ? 800 : 700}
            letterSpacing={font * 0.08}
            strokeWidth={font * 0.32}
            paintOrder="stroke"
            strokeLinejoin="round"
            className={clsx(
              'uppercase',
              important ? 'fill-slate-900 dark:fill-white' : 'fill-slate-600 dark:fill-slate-200/85',
              'stroke-[#e9f3fa] dark:stroke-[#0a1524]',
            )}
          >
            {f.properties.nombre}
          </text>
        )
      })}
    </g>
  )
}

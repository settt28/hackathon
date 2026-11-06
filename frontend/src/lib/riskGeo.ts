import type { RiskDistrict, RiskMap } from './api'

/** Radio del mapa de riesgo alrededor de la persona (también se le pide al backend). */
export const MAP_RADIUS_KM = 20

/**
 * Unidades del SVG: píxeles del mundo Web Mercator a zoom 20. Es la misma proyección de los mosaicos del mapa base
 * (Esri), así los distritos calzan exactamente sobre calles, costa y ríos.
 */
export const WORLD_ZOOM = 20
export const TILE_PX = 256
const WORLD = TILE_PX * 2 ** WORLD_ZOOM
const EARTH_CIRCUMFERENCE_M = 40_075_016.686

/** [lon, lat] → píxeles del mundo a zoom 20. */
export function mercator(lon: number, lat: number): [number, number] {
  const sin = Math.sin((lat * Math.PI) / 180)
  return [((lon + 180) / 360) * WORLD, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * WORLD]
}

/** Polígonos de cada distrito, sin importar si vienen como Polygon o MultiPolygon. */
const polygonsOf = (f: RiskDistrict) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)

/** Dónde va el nombre del distrito (centroide de su polígono más grande) y cuánto espacio tiene (caja, en unidades). */
export type DistrictLabel = { x: number; y: number; w: number; h: number }

export type Projection = {
  viewBox: string
  /** Mitad del lado del área visible en unidades del SVG: equivale a MAP_RADIUS_KM. */
  half: number
  /** Ubicación de la persona en píxeles del mundo (zoom 20): es el (0, 0) del SVG. */
  origin: [number, number]
  paths: { f: RiskDistrict; d: string; label: DistrictLabel }[]
}

/** Centroide (fórmula del área) y caja de un anillo ya proyectado. */
function ringInfo(p: [number, number][]) {
  let a = 0
  let cx = 0
  let cy = 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i]
    const [x1, y1] = p[(i + 1) % p.length]
    const cross = x0 * y1 - x1 * y0
    a += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
    minX = Math.min(minX, x0)
    minY = Math.min(minY, y0)
    maxX = Math.max(maxX, x0)
    maxY = Math.max(maxY, y0)
  }
  const area = Math.abs(a / 2)
  const label: DistrictLabel =
    area > 0
      ? { x: cx / (3 * a), y: cy / (3 * a), w: maxX - minX, h: maxY - minY }
      : { x: (minX + maxX) / 2, y: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
  return { area, label }
}

// La tarjeta del inicio y el pop-up dibujan el mismo mapa: se proyecta una sola vez por respuesta
const projections = new WeakMap<RiskMap, Projection>()

/**
 * Proyecta los distritos en Web Mercator con origen en la persona. El área visible es un cuadrado de
 * ±MAP_RADIUS_KM centrado en ella, así un marcador fijo en el centro cae sobre su posición.
 */
export function projectRiskMap(map: RiskMap): Projection {
  const cached = projections.get(map)
  if (cached) return cached

  const [lon0, lat0] = map.centro
  const origin = mercator(lon0, lat0)
  // Metros → unidades: en Mercator la escala crece con la latitud (1 / cos)
  const half = (MAP_RADIUS_KM * 1000 * WORLD) / (EARTH_CIRCUMFERENCE_M * Math.cos((lat0 * Math.PI) / 180))
  const project = ([lon, lat]: [number, number]): [number, number] => {
    const [x, y] = mercator(lon, lat)
    return [x - origin[0], y - origin[1]]
  }

  const projection: Projection = {
    viewBox: `${-half} ${-half} ${2 * half} ${2 * half}`,
    half,
    origin,
    paths: map.features.map((f) => {
      let best = { area: -1, label: { x: 0, y: 0, w: 0, h: 0 } as DistrictLabel }
      const d = polygonsOf(f)
        .flatMap((poly) =>
          poly.map((ring, i) => {
            const p = ring.map(project)
            if (i === 0) {
              const info = ringInfo(p)
              if (info.area > best.area) best = info
            }
            // 1 unidad ≈ 15 cm: enteros bastan y el SVG pesa menos
            return `M${p.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join('L')}Z`
          }),
        )
        .join('')
      return { f, d, label: best.label }
    }),
  }
  projections.set(map, projection)
  return projection
}

/** "menos de 1 %" en vez de un "0 %" que suena a imposible. */
export const formatProbability = (p?: number | null) =>
  p == null ? '—' : p < 0.005 ? 'menos de 1 %' : `${Math.round(p * 100)} %`

/** Píxeles de pantalla por unidad del SVG con preserveAspectRatio="xMidYMid slice" (sin el zoom de los botones). */
export const pxPerUnit = (geo: Projection, width: number, height: number) => Math.max(width, height) / (2 * geo.half)

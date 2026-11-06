import type { RiskDistrict, RiskMap } from './api'

/** Polígonos de cada distrito, sin importar si vienen como Polygon o MultiPolygon. */
const polygonsOf = (f: RiskDistrict) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)

/**
 * Proyección equirectangular corregida por la latitud, con origen en el usuario: a la escala de unos
 * pocos distritos es indistinguible de la de un mapa web y no necesita librerías.
 * El viewBox queda centrado en el usuario, así un marcador fijo en el centro cae sobre su posición.
 */
export function projectRiskMap(map: RiskMap) {
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

/** "menos de 1 %" en vez de un "0 %" que suena a imposible. */
export const formatProbability = (p?: number | null) =>
  p == null ? '—' : p < 0.005 ? 'menos de 1 %' : `${Math.round(p * 100)} %`

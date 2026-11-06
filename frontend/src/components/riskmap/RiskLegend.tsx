import type { FC } from 'react'
import type { RiskMap } from '../../lib/api'

/** Leyenda de colores del mapa de riesgo (los colores vienen del backend, iguales a los del mapa). */
const RiskLegend: FC<{ legend: RiskMap['leyenda'] }> = ({ legend }) => (
  <ul className="mt-3 flex flex-wrap justify-between gap-1.5" aria-label="Leyenda de niveles de riesgo">
    {legend.map((l) => (
      <li
        key={l.nivel}
        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 dark:bg-white/5 dark:text-slate-200"
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
        {l.nivel}
      </li>
    ))}
  </ul>
)

export default RiskLegend

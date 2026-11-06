import type { FC } from 'react'
import clsx from 'clsx'
import { RISK_ORDER, RISK_STYLES } from './districts'

/** Leyenda de colores del mapa de riesgo. */
const RiskLegend: FC = () => (
  <ul className="mt-3 flex justify-between gap-1.5" aria-label="Leyenda de niveles de riesgo">
    {RISK_ORDER.map((level) => (
      <li
        key={level}
        className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/5 dark:text-slate-200"
      >
        <span className={clsx('h-2.5 w-2.5 rounded-full', RISK_STYLES[level].dot)} aria-hidden />
        {RISK_STYLES[level].label}
      </li>
    ))}
  </ul>
)

export default RiskLegend

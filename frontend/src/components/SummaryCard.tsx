import { useState, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico' | 'sinAlertas' | 'sinDatos'

// Clases completas por nivel para que Tailwind las incluya en el build
const RISK_STYLES: Record<RiskLevel, { label: string; className: string }> = {
  bajo: { label: 'Riesgo bajo', className: 'bg-green-100 text-green-800' },
  medio: { label: 'Riesgo medio', className: 'bg-yellow-100 text-yellow-800' },
  alto: { label: 'Riesgo alto', className: 'bg-red-100 text-red-700' },
  critico: { label: 'Riesgo crítico', className: 'bg-red-700 text-white' },
  // "Sin alertas" y "Sin datos" no son "riesgo bajo": no hay que afirmar seguridad que no se conoce
  sinAlertas: { label: 'Sin alertas', className: 'bg-slate-100 text-slate-700' },
  sinDatos: { label: 'Sin datos', className: 'bg-slate-100 text-slate-500' },
}

type SummaryCardProps = {
  title: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  risk: RiskLevel
  /** Resumen de una línea: lo único visible por defecto. */
  summary: string
  /** Detalle que se revela bajo demanda (divulgación progresiva). */
  details: ReactNode
  to: string
}

/**
 * Tarjeta de resumen con Divulgación Progresiva:
 * nivel 1 = título + riesgo + resumen; nivel 2 = detalle al pulsar "Ver más"; nivel 3 = módulo completo.
 */
export default function SummaryCard({ title, icon: Icon, iconClassName, risk, summary, details, to }: SummaryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const riskStyle = RISK_STYLES[risk]

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`rounded-xl p-2.5 ${iconClassName}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${riskStyle.className}`}>
            {riskStyle.label}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">{summary}</p>

      {expanded && <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{details}</div>}

      <div className="mt-auto flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
        <Link to={to} className="text-sm font-semibold text-sky-700 hover:underline">
          Ir al módulo →
        </Link>
      </div>
    </article>
  )
}

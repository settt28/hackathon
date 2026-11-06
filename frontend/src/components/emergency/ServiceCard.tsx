import type { FC } from 'react'
import { Globe, Phone } from 'lucide-react'
import clsx from 'clsx'
import type { EmergencyService } from './emergencyServices'

interface ServiceCardProps {
  service: EmergencyService
}

/**
 * Tarjeta de un organismo: ícono, enlace a la página oficial (globo), número, nombre y botón "Llamar".
 * "Llamar" abre el marcador del teléfono con un enlace `tel:`.
 */
const ServiceCard: FC<ServiceCardProps> = ({ service }) => {
  const { icon: Icon, theme } = service

  return (
    <article className={clsx('flex flex-col rounded-3xl border bg-white p-3.5 @6xl:p-6 shadow-sm dark:bg-[#0b1a26] dark:shadow-none', theme.card)}>
      <div className="flex items-start justify-between">
        <span className={clsx('flex h-11 w-11 @6xl:h-14 @6xl:w-14 items-center justify-center rounded-2xl border', theme.iconBox)}>
          <Icon className="h-5 w-5 @6xl:h-7 @6xl:w-7" aria-hidden />
        </span>
        <a
          href={service.website}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir la página oficial de ${service.name}`}
          className="flex h-10 w-11 @6xl:h-12 @6xl:w-14 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white dark:focus-visible:ring-cyan-400"
        >
          <Globe className="h-4 w-4 @6xl:h-5 @6xl:w-5" />
        </a>
      </div>

      <p className={clsx('mt-4 text-[34px] @6xl:mt-6 @6xl:text-6xl font-extrabold leading-none tracking-tight', theme.number)}>{service.number}</p>
      <h2 className="mt-1 text-[15px] @6xl:mt-3 @6xl:text-xl font-bold text-slate-900 dark:text-white">{service.name}</h2>
      {/* flex-1: en una fila de tarjetas, los botones "Llamar" quedan alineados abajo */}
      <p className="flex-1 text-xs @6xl:mt-1 @6xl:text-sm text-slate-500 dark:text-slate-300">{service.description}</p>

      <a
        href={`tel:${service.number}`}
        aria-label={`Llamar a ${service.name} al ${service.number}`}
        className={clsx(
          'mt-3 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-[15px] @6xl:mt-6 @6xl:py-4 @6xl:text-lg font-bold text-[#0b1626] transition-colors focus-visible:outline-none focus-visible:ring-2 active:scale-95',
          theme.button,
        )}
      >
        <Phone className="h-4 w-4 @6xl:h-5 @6xl:w-5" strokeWidth={2.25} aria-hidden />
        Llamar
      </a>
    </article>
  )
}

export default ServiceCard

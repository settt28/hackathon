import PatyLogo from './PatyLogo'

interface PatyHeroProps {
  greeting: string
  userName?: string
}

/** Bloque de bienvenida: logo animado, saludo personalizado y descripción. */
export default function PatyHero({ greeting, userName }: PatyHeroProps) {
  return (
    <section className="flex flex-col items-center px-6 pt-8 text-center">
      <PatyLogo glowClassName="bg-sky-300/30 dark:bg-cyan-400/20" />
      <h2 className="mt-6 text-[26px] font-bold leading-tight text-slate-900 dark:text-white">
        {greeting}
        {userName && (
          <>
            , <span className="text-sky-600 dark:text-cyan-300">{userName}</span>
          </>
        )}
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-cyan-200/60">
        Tu asistente oficial para el pronóstico del tiempo, alertas y monitoreo ambiental en todo el Perú.
      </p>
    </section>
  )
}

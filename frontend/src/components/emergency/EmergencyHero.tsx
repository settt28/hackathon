import type { FC } from 'react'
import { Siren } from 'lucide-react'

/** Tarjeta de bienvenida: sirena con halo y la pregunta principal. */
const EmergencyHero: FC = () => (
  <section className="mx-4 mt-4 flex flex-col items-center justify-center rounded-3xl @3xl:m-0 @6xl:py-8 border border-red-200 bg-white px-3 pb-4 pt-4 text-center shadow-sm dark:border-red-500/25 dark:bg-gradient-to-b dark:from-[#1f1016] dark:to-[#170f14] dark:shadow-none">
    <div className="relative flex h-14 w-14 items-center justify-center @6xl:h-20 @6xl:w-20">
      <span className="absolute -inset-2 rounded-full bg-red-500/15 dark:bg-red-500/20" aria-hidden />
      <span className="relative flex h-14 w-14 @6xl:h-20 @6xl:w-20 items-center justify-center rounded-full border-2 border-red-200 bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_0_24px_rgba(239,68,68,0.45)]">
        <Siren className="h-6 w-6 @6xl:h-9 @6xl:w-9" aria-hidden />
      </span>
    </div>
    <h1 className="mt-3 text-[22px] @6xl:mt-5 @6xl:text-4xl font-extrabold text-slate-900 dark:text-white">¿Qué necesitas ahora?</h1>
    <p className="mt-1 text-xs @6xl:mt-2 @6xl:text-base text-slate-600 dark:text-slate-300">Toca un organismo para llamar o abrir su página oficial.</p>
  </section>
)

export default EmergencyHero

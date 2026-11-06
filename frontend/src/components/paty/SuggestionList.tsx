import clsx from 'clsx'
import type { Suggestion } from './suggestions'

interface SuggestionListProps {
  items: Suggestion[]
  onSelect: (item: Suggestion) => void
}

/** Lista de sugerencias rápidas renderizada a partir de datos (estilo de tarjeta del dashboard). */
export default function SuggestionList({ items, onSelect }: SuggestionListProps) {
  return (
    <ul className="mt-8 flex flex-col gap-2.5 px-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-[15px] leading-snug text-slate-900 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-[0.99] dark:border-cyan-400/15 dark:bg-[#0b1a26] dark:text-white dark:shadow-none dark:hover:border-cyan-400/40 dark:hover:bg-[#0e2030] dark:focus-visible:ring-cyan-400"
            >
              <span className={clsx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', item.iconBoxClassName)}>
                <Icon className={clsx('h-5 w-5', item.iconClassName)} aria-hidden />
              </span>
              {item.text}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

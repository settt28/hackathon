import clsx from 'clsx'

interface FilterChipsProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

/** Filtros tipo "chip"; el activo se resalta en cian. */
export default function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label="Filtrar eventos" className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={clsx(
              'shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:focus-visible:ring-cyan-400',
              active
                ? 'border-sky-500 bg-sky-500 text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-[#070d17]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/15 dark:bg-transparent dark:text-slate-300 dark:hover:border-white/30',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

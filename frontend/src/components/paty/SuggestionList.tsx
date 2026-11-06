import type { Suggestion } from './suggestions'

interface SuggestionListProps {
  items: Suggestion[]
  onSelect: (item: Suggestion) => void
}

/** Lista de sugerencias rápidas renderizada a partir de datos. */
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
              className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl border border-[#1e3460] bg-[#11234a] px-4 py-3 text-left text-[15px] leading-snug text-white transition-colors hover:border-[#2b4a85] hover:bg-[#162c5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 active:bg-[#1a3266]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0c1a36]">
                <Icon className={`h-5 w-5 ${item.iconClassName}`} aria-hidden />
              </span>
              {item.text}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

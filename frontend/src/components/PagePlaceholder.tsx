/** Vista provisional para módulos aún sin implementar. */
export default function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
        Módulo en construcción
      </div>
    </div>
  )
}

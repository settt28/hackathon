import SummaryCard from '../components/SummaryCard'
import { AlertIcon, HeartIcon, LeafIcon } from '../components/Icons'

/**
 * Pantalla de Inicio con Divulgación Progresiva:
 * solo muestra tarjetas de resumen; el detalle se abre bajo demanda o en cada módulo.
 * Datos de ejemplo: reemplazar por llamadas a la API (/api/salud/alertas, etc.).
 */
export default function Home() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="mb-6">
        <h2 className="text-xl font-bold md:text-2xl">Resumen de hoy</h2>
        <p className="mt-1 text-sm text-slate-500">Estado preventivo ante el Fenómeno El Niño en tu zona.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Salud"
          icon={HeartIcon}
          iconClassName="bg-rose-50 text-rose-600"
          risk="medio"
          summary="Aumento de casos de dengue en la región."
          details={
            <ul className="list-disc space-y-1 pl-5">
              <li>Elimina recipientes con agua estancada.</li>
              <li>Usa repelente y mosquiteros.</li>
            </ul>
          }
          to="/salud"
        />
        <SummaryCard
          title="Agro"
          icon={LeafIcon}
          iconClassName="bg-emerald-50 text-emerald-600"
          risk="bajo"
          summary="Lluvias moderadas previstas esta semana."
          details={
            <ul className="list-disc space-y-1 pl-5">
              <li>Revisa canales de drenaje de parcelas.</li>
              <li>Protege semillas y fertilizantes de la humedad.</li>
            </ul>
          }
          to="/agro"
        />
        <SummaryCard
          title="Emergencias"
          icon={AlertIcon}
          iconClassName="bg-amber-50 text-amber-600"
          risk="alto"
          summary="Riesgo de huaicos en quebradas cercanas."
          details={
            <ul className="list-disc space-y-1 pl-5">
              <li>Identifica tu zona segura y ruta de evacuación.</li>
              <li>Emergencias: 116 (Bomberos) · 115 (Defensa Civil) · 106 (SAMU).</li>
            </ul>
          }
          to="/infraestructura"
        />
      </div>
    </div>
  )
}

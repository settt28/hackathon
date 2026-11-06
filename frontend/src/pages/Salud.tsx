import DomainModule from '../components/DomainModule'

/** Módulo de Salud: alertas sanitarias (dengue, enfermedades respiratorias, etc.). */
export default function Salud() {
  return <DomainModule dominio="salud" title="Salud" description="Alertas sanitarias y recomendaciones de prevención." />
}

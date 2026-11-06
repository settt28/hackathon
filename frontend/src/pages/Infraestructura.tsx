import DomainModule from '../components/DomainModule'

/** Módulo de Infraestructura: alertas de huaicos e inundaciones, y recomendaciones de evacuación. */
export default function Infraestructura() {
  return <DomainModule dominio="infraestructura" title="Infraestructura" description="Alertas de emergencia y recomendaciones de evacuación." />
}

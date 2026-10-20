import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icons'

export default function IncidentHeader({ onAdd, driverView = false }: { onAdd: () => void; driverView?: boolean }) {
  return (
    <div className="@container mb-4">
    <div className="grid items-center gap-3 @2xl:grid-cols-[minmax(0,1fr)_auto] @2xl:gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-medium tracking-tight @sm:text-3xl">{driverView ? 'Meus incidentes' : 'Central de incidentes'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{driverView ? 'Registre uma ocorrência e acompanhe o atendimento da central.' : 'Acompanhe as ocorrências e mantenha a operação no caminho.'}</p>
      </div>
      <Button onClick={onAdd} className="w-full whitespace-nowrap @2xl:w-auto"><Icon name="plus" />Registrar incidente</Button>
    </div>
    </div>
  )
}

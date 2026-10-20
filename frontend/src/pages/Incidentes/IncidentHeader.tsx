import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icons'

export default function IncidentHeader({ onAdd, driverView = false }: { onAdd: () => void; driverView?: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">{driverView ? 'Meus incidentes' : 'Central de incidentes'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{driverView ? 'Registre uma ocorrência e acompanhe o atendimento da central.' : 'Acompanhe as ocorrências e mantenha a operação no caminho.'}</p>
      </div>
      <Button onClick={onAdd} className="w-full sm:w-auto"><Icon name="plus" />Registrar incidente</Button>
    </div>
  )
}

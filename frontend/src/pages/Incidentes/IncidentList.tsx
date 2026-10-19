import type { Incident, Severity } from '../../interfaces/Incident'
import IncidentCard from '../../components/incident/IncidentCard'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icons'

interface IncidentListProps {
  incidents: Incident[]
  onOpen: (incident: Incident) => void
  onClearFilters: () => void
}

const groups: { severity: Severity; title: string; style: string; icon: string }[] = [
  { severity: 'Alta', title: 'Alta — atenção imediata', style: 'text-red-800 border-red-200 bg-white', icon: 'alert' },
  { severity: 'Média', title: 'Média', style: 'text-amber-900 border-amber-200 bg-white', icon: 'clock' },
  { severity: 'Baixa', title: 'Baixa', style: 'text-slate-700 border-line bg-white', icon: 'grid' },
]

export default function IncidentList({ incidents, onOpen, onClearFilters }: IncidentListProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-muted">
        <span className="mb-4 inline-block"><Icon name="search" size={30} /></span>
        <h3 className="mb-2 text-base font-medium text-ink">Nenhuma ocorrência encontrada</h3>
        <p className="mb-5 text-sm">Experimente ajustar a busca ou os filtros.</p>
        <Button onClick={onClearFilters}>Limpar filtros</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(group => {
        const items = incidents.filter(incident => incident.severity === group.severity)
        if (!items.length) return null
        const hasActive = items.some(incident => incident.status !== 'Resolvido')
        return <section key={group.severity} aria-label={`Criticidade ${group.severity.toLowerCase()}`}>
          <div className={`mb-2 flex items-center gap-2 rounded-md border px-3 py-2 ${group.severity === 'Alta' && !hasActive ? 'border-line bg-white text-slate-700' : group.style}`}>
            <Icon name={group.severity === 'Alta' && !hasActive ? 'check' : group.icon} size={16} />
            <h3 className="text-sm font-semibold">{group.severity === 'Alta' && !hasActive ? 'Alta — resolvidos' : group.title}</h3>
            <span className="ml-auto text-sm font-semibold tabular-nums">{items.length}</span>
          </div>
          <div className="flex flex-col gap-2">{items.map(incident => <IncidentCard key={incident.id} incident={incident} onSelect={onOpen} />)}</div>
        </section>
      })}
    </div>
  )
}

import type { Incident } from '../../interfaces/Incident'
import Icon from '../ui/Icons'

const severityStyles = {
  Alta: { border: 'border-l-[#d46b60]', badge: 'bg-[#fcf0ee] text-[#a6483e]' },
  Média: { border: 'border-l-[#d7af5e]', badge: 'bg-[#faf5e8] text-[#88691f]' },
  Baixa: { border: 'border-l-[#75a39a]', badge: 'bg-[#edf5f2] text-[#427568]' },
}

export default function IncidentCard({ incident, onSelect }: { incident: Incident; onSelect: (incident: Incident) => void }) {
  const severity = severityStyles[incident.severity]
  const urgent = incident.severity === 'Alta' && incident.status !== 'Resolvido'
  const status = incident.status === 'Em andamento'
    ? 'border-blue-100 bg-blue-50 text-blue-800'
    : incident.status === 'Resolvido'
      ? 'border-green-100 bg-green-50 text-green-800'
      : 'border-line bg-canvas text-muted'

  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className={`w-full rounded-lg border px-4 py-3 text-left sm:py-2.5 ${urgent
        ? 'border-red-200 border-l-4 border-l-red-600 bg-white hover:border-t-red-400 hover:border-r-red-400 hover:border-b-red-400'
        : `border-line border-l-3 bg-white hover:border-t-slate-400 hover:border-r-slate-400 hover:border-b-slate-400 ${severity.border}`}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
        <h4 title={incident.title} className={`min-w-0 max-w-full truncate text-base leading-snug ${urgent ? 'font-semibold text-red-950' : 'font-medium'}`}>
          {incident.title}
        </h4>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${urgent ? 'bg-red-700 text-white' : severity.badge}`}>
            {urgent ? <Icon name="alert" size={13} /> : <span className="size-1 rounded-full bg-current" />}
            {incident.severity}
        </span>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${status}`}>{incident.status === 'Em andamento' ? 'Andamento' : incident.status}</span>
        <span className="shrink-0 text-xs tracking-wide text-muted">{incident.id}</span>
        </div>
        <span className={`ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm ${urgent ? 'font-semibold text-red-800' : 'text-muted'}`}>
          <Icon name="clock" size={16} />{incident.time}
        </span>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-muted">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>{incident.driver}</span><span aria-hidden="true">·</span>
          <span className="tracking-wide">{incident.plate}</span>
          <span className="border-l border-line pl-2">{incident.category}</span>
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs leading-none"><span>Ocorrência</span><span className="translate-y-px"><Icon name="arrow" size={15} /></span></span>
      </div>
    </button>
  )
}

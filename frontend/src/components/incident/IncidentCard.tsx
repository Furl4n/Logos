import type { Incident } from '../../interfaces/Incident'
import { isIncidentClosed } from '../../interfaces/Incident'
import Icon from '../ui/Icons'

const severityStyles = {
  Alta: { border: 'border-l-priority-high', badge: 'bg-danger-soft text-danger' },
  Média: { border: 'border-l-priority-medium', badge: 'bg-warning-soft text-warning' },
  Baixa: { border: 'border-l-priority-low', badge: 'bg-success-soft text-success' },
}

export default function IncidentCard({ incident, onSelect, showPriority = false }: { incident: Incident; onSelect: (incident: Incident) => void; showPriority?: boolean }) {
  const severity = severityStyles[incident.severity]
  const urgent = incident.severity === 'Alta' && !isIncidentClosed(incident.status)
  const status = incident.status === 'Em investigação'
    ? 'border-info-line bg-info-soft text-info'
    : incident.status === 'Fechado'
      ? 'border-success-line bg-success-soft text-success'
      : incident.status === 'Inconclusivo'
        ? 'border-strong bg-neutral-soft text-subtle'
        : 'border-line bg-canvas text-subtle'

  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className={`@container w-full min-w-0 rounded-lg border px-3 py-3 text-left sm:px-4 sm:py-2.5 ${urgent
        ? 'border-danger-line border-l-4 border-l-red-600 bg-surface hover:border-t-red-400 hover:border-r-red-400 hover:border-b-red-400'
        : `border-line border-l-3 bg-surface hover:border-t-slate-400 hover:border-r-slate-400 hover:border-b-slate-400 ${severity.border}`}`}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 @3xl:flex">
        <h4 title={incident.title} className="min-w-0 truncate text-base leading-snug font-medium text-ink @3xl:shrink">
          {incident.title}
        </h4>
        <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-2 @3xl:shrink-0 @3xl:flex-nowrap">
        {(!urgent || showPriority) && <span className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${severity.badge}`}>
            <span className="size-1 rounded-full bg-current" />
            {incident.severity}
        </span>}
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs ${status}`}>{incident.status}</span>
        <span className="min-w-0 truncate text-xs tracking-wide text-muted">{incident.code ?? incident.id}</span>
        </div>
        <span className={`col-start-2 row-start-1 ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap text-xs @sm:gap-1.5 @sm:text-sm ${urgent ? 'font-semibold text-danger' : 'text-muted'}`}>
          <Icon name="clock" size={16} />{incident.time}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 text-muted @3xl:mt-1.5">
        <span className="flex min-w-0 flex-1 flex-col gap-1 text-sm @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate" title={incident.driver}>{incident.driver}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0 tracking-wide">{incident.plate}</span>
          </span>
          <span className="break-words @xl:border-l @xl:border-line @xl:pl-2">{incident.category}</span>
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs leading-none"><span>Ocorrência</span><span className="translate-y-px"><Icon name="arrow" size={15} /></span></span>
      </div>
    </button>
  )
}

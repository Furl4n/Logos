import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../../components/ui/Icons'
import FormSelect from '../../components/ui/FormSelect'
import FormField from '../../components/ui/FormField'
import Button from '../../components/ui/Button'
import type { IncidentFilters } from '../../interfaces/Api'
import type { TimeOrder } from '../../interfaces/Incident'
import { incidentCategories, incidentStatuses } from '../../interfaces/Incident'

interface FilterValues {
  severity: string
  category: string
  status: string
}
interface Props extends FilterValues {
  assignment: NonNullable<IncidentFilters['assignment']>
  setAssignment: (value: NonNullable<IncidentFilters['assignment']>) => void
  search: string
  setSearch: (value: string) => void
  hasFilters: boolean
  clearFilters: () => void
  timeOrder: TimeOrder
  setTimeOrder: (value: TimeOrder) => void
  applyFilters: (values: FilterValues) => void
  driverView: boolean
}
const options = (values: readonly string[]) => values.map(value => ({ value, label: value }))
const categoryOptions = options(['Todas', ...incidentCategories])
const severityOptions = options(['Todas', 'Alta', 'Média', 'Baixa'])
const statusOptions = options(['Ativos', 'Todos', ...incidentStatuses])
const assignmentOptions = [{ value: 'ALL', label: 'Todos' }, { value: 'MINE', label: 'Meus atendimentos' }, { value: 'UNASSIGNED', label: 'Sem responsável' }]
const timeOptions = [{ value: 'newest', label: 'Mais recentes' }, { value: 'oldest', label: 'Mais antigos' }]

export default function IncidentToolbar({ search, setSearch, severity, category, status, assignment, setAssignment, hasFilters, clearFilters, timeOrder, setTimeOrder, applyFilters, driverView }: Props) {
  const [open, setOpen] = useState(false)
  const filterButton = useRef<HTMLButtonElement>(null)
  const count = Number(severity !== 'Todas') + Number(category !== 'Todas') + Number(status !== 'Ativos')
  return <>
    <div className="@container">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 @5xl:flex">
      <label className={`flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-muted focus-within:border-brand focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${hasFilters ? '' : 'col-span-2'}`}>
        <Icon name="search" />
        <input aria-label="Buscar incidentes" placeholder="Buscar por ocorrência, motorista ou placa..." value={search} onChange={event => setSearch(event.target.value)} className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted focus-visible:outline-none sm:text-sm" />
      </label>
      <div className={`order-2 col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 @5xl:order-1 @5xl:flex [&_button]:w-full @5xl:[&_button]:w-auto ${driverView ? '' : '@xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]'}`}>
        <button ref={filterButton} type="button" onClick={() => setOpen(value => !value)} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? 'incident-filters' : undefined} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium ${count ? 'border-brand/50 bg-brand-soft text-brand-dark' : 'border-line bg-surface text-ink hover:border-strong'}`}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
          Filtros{count > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-xs text-white">{count}</span>}
        </button>
        {!driverView && <div className="min-w-0"><FormSelect label="Responsável" ariaLabel="Filtrar por responsável" value={assignment} options={assignmentOptions} active={assignment !== 'ALL'} onChange={value => setAssignment(value as Props['assignment'])} /></div>}
        <div className={`min-w-0 ${driverView ? '' : 'col-span-2 @xl:col-span-1'}`}><FormSelect label="Ordenar" ariaLabel="Ordenar por tempo de ocorrência" value={timeOrder} options={timeOptions} onChange={value => setTimeOrder(value === 'oldest' ? 'oldest' : 'newest')} /></div>
      </div>
      {hasFilters && <button type="button" onClick={clearFilters} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md px-1.5 text-sm font-medium text-brand-dark hover:bg-brand-soft @5xl:order-2"><Icon name="close" size={14} />Limpar</button>}
    </div>
    </div>
    {open && <FilterPanel anchor={filterButton} initial={{ severity, category, status }} onClose={() => setOpen(false)} onApply={values => { applyFilters(values); setOpen(false); filterButton.current?.focus() }} />}
  </>
}

function FilterPanel({ anchor, initial, onClose, onApply }: { anchor: RefObject<HTMLButtonElement | null>; initial: FilterValues; onClose: () => void; onApply: (values: FilterValues) => void }) {
  const [draft, setDraft] = useState(initial)
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose }, [onClose])
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 0 })
  useLayoutEffect(() => {
    function place() {
      const rect = anchor.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(360, window.innerWidth - 24)
      setPosition({ top: rect.bottom + 6, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), maxHeight: Math.max(0, window.innerHeight - rect.bottom - 18) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [anchor])
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    function outside(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node) && !anchor.current?.contains(event.target as Node)) close.current()
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { close.current(); anchor.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [anchor])
  const fields: { key: keyof FilterValues; label: string; options: { value: string; label: string }[] }[] = [
    { key: 'severity', label: 'Criticidade', options: severityOptions },
    { key: 'category', label: 'Categoria', options: categoryOptions },
    { key: 'status', label: 'Status', options: statusOptions },
  ]
  return createPortal(<div ref={panel} id="incident-filters" role="dialog" aria-labelledby="incident-filters-title" style={position} className="fixed z-30 w-90 max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-surface shadow-lg shadow-slate-900/10">
    <div style={{ maxHeight: Math.max(0, position.maxHeight - 2) }} className="overflow-y-auto overscroll-contain rounded-lg p-4">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id="incident-filters-title" className="text-lg font-medium">Filtros</h2>
      <button type="button" aria-label="Fechar filtros" onClick={() => { onClose(); anchor.current?.focus() }} className="grid size-8 place-items-center rounded-md hover:bg-brand-soft"><Icon name="close" /></button>
    </div>
    <form onSubmit={event => { event.preventDefault(); onApply(draft) }}>
      <div className="space-y-4">
        {fields.map(field => <FormField key={field.key} id={`filter-${field.key}`} label={field.label} showRequiredIndicator={false}>
          <FormSelect id={`filter-${field.key}`} variant="field" wrapLabel={field.key === 'category'} label={field.label} ariaLabel={`Filtrar por ${field.label.toLowerCase()}`} value={draft[field.key]} options={field.options} onChange={value => setDraft(current => ({ ...current, [field.key]: value }))} />
        </FormField>)}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setDraft({ severity: 'Todas', category: 'Todas', status: 'Ativos' })} className="rounded-md px-2 py-2 text-sm font-medium text-brand-dark hover:bg-brand-soft">Limpar filtros</button>
        <Button type="submit">Aplicar filtros</Button>
      </div>
    </form>
    </div>
  </div>, document.body)
}

import Icon from '../../components/ui/Icons'
import FormSelect from '../../components/ui/FormSelect'
import type { TimeOrder } from '../../interfaces/Incident'
import { incidentCategories, incidentStatuses } from '../../interfaces/Incident'

interface Props {
  search: string
  setSearch: (search: string) => void
  severity: string
  setSeverity: (severity: string) => void
  category: string
  setCategory: (category: string) => void
  hasFilters: boolean
  clearFilters: () => void
  timeOrder: TimeOrder
  setTimeOrder: (order: TimeOrder) => void
  status: string
  setStatus: (status: string) => void
}

const categoryOptions = ['Todas', ...incidentCategories].map(value => ({ value, label: value }))
const severityOptions = ['Todas', 'Alta', 'Média', 'Baixa'].map(value => ({ value, label: value }))
const statusOptions = [
  { value: 'Ativos', label: 'Ativos' },
  { value: 'Todos', label: 'Todos' },
  ...incidentStatuses.map(value => ({ value, label: value })),
]
const timeOptions = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
]

export default function IncidentToolbar({ search, setSearch, severity, setSeverity, category, setCategory, hasFilters, clearFilters, timeOrder, setTimeOrder, status, setStatus }: Props) {
  return (
    <div className="@container">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 @5xl:flex">
      <label className={`flex h-10 min-w-0 flex-[1_1_240px] items-center gap-2 rounded-md border border-line bg-canvas px-3 text-muted focus-within:border-brand focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${hasFilters ? '' : 'col-span-2'}`}>
        <Icon name="search" />
        <input
          aria-label="Buscar incidentes"
          placeholder="Buscar por ocorrência, motorista ou placa..."
          value={search}
          onChange={event => setSearch(event.target.value)}
          className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-muted focus-visible:outline-none sm:text-sm"
        />
      </label>
      <div className="order-2 col-span-2 min-w-0 @5xl:order-1">
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 @3xl:grid-cols-4 @5xl:flex [&_button]:w-full @5xl:[&_button]:w-auto">
      <FormSelect label="Criticidade" ariaLabel="Filtrar por criticidade" value={severity} options={severityOptions} onChange={setSeverity} active={severity !== 'Todas'} />
      <FormSelect label="Categoria" ariaLabel="Filtrar por categoria" value={category} options={categoryOptions} onChange={setCategory} active={category !== 'Todas'} />
      <FormSelect label="Ordenar" ariaLabel="Ordenar por tempo de ocorrência" value={timeOrder} options={timeOptions} onChange={value => setTimeOrder(value === 'oldest' ? 'oldest' : 'newest')} />
      <FormSelect label="Status" ariaLabel="Filtrar por status" value={status} options={statusOptions} onChange={setStatus} active={status !== 'Ativos'} />
      </div>
      </div>
      {hasFilters && (
        <button type="button" onClick={clearFilters} className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 text-sm font-medium text-brand-dark hover:border-brand/20 hover:bg-brand-soft @5xl:order-2">
          <Icon name="close" size={14} />Limpar
        </button>
      )}
    </div>
    </div>
  )
}

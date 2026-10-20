import { useState } from 'react'
import type { CreateIncidentInput, Incident } from '../../interfaces/Incident'
import { useIncidents } from '../../hooks/useIncidents'
import Icon from '../../components/ui/Icons'
import IncidentFormModal from '../../components/incident/IncidentFormModal'
import IncidentDetailsModal from '../../components/incident/IncidentDetailsModal'
import IncidentToolbar from './IncidentToolbar'
import IncidentList from './IncidentList'
import IncidentHeader from './IncidentHeader'
import { useProfile } from '../../hooks/useProfile'
import { useCurrentUser } from '../../hooks/useAuth'
import { useCreateIncident, useIncidentDetails } from '../../hooks/useIncidentApi'
import { categoryLabels, enumValue, severityLabels, toIncidentDetail } from '../../service/incidentMapper'
import Modal from '../../components/ui/Modal'
import { ApiError } from '../../service/api'

export default function Incidentes() {
  const { profile } = useProfile()
  return <IncidentPage key={profile} driverView={profile === 'driver'} />
}

function IncidentPage({ driverView }: { driverView: boolean }) {
  const state = useIncidents()
  const { data: user } = useCurrentUser()
  const create = useCreateIncident()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detail = useIncidentDetails(selectedId)
  const selected = detail.data ? toIncidentDetail(detail.data) : null
  const [formOpen, setFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  async function handleSave(input: CreateIncidentInput) {
    const category = enumValue(categoryLabels, input.category)
    const severity = enumValue(severityLabels, input.severity)
    if (!category || !severity) throw new Error('Selecione categoria e criticidade válidas.')
    const incident = await create.mutateAsync({
      title: input.title, description: input.description, category, severity,
      truckPlate: input.plate, location: input.location, occurredAt: input.occurredAt,
      routeCode: input.route || null, ...(driverView ? {} : { driverId: input.driverId }),
    })
    state.clearFilters()
    state.setTimeOrder('newest')
    setFormOpen(false)
    setSuccessMessage(`${incident.code} registrado com sucesso.`)
  }
  return <>
    <IncidentHeader driverView={driverView} onAdd={() => { setSuccessMessage(''); setFormOpen(true) }} />
    {successMessage && <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-white px-3 py-2 text-sm text-green-800"><Icon name="check" size={17} /><span>{successMessage}</span><button type="button" aria-label="Fechar confirmação" onClick={() => setSuccessMessage('')} className="ml-auto rounded p-1"><Icon name="close" size={16} /></button></div>}
    <section aria-label="Fila de ocorrências">
      <IncidentToolbar
        search={state.search}
        setSearch={state.setSearch}
        severity={state.severity}
        setSeverity={state.setSeverity}
        category={state.category}
        setCategory={state.setCategory}
        hasFilters={state.hasFilters}
        clearFilters={state.clearFilters}
        timeOrder={state.timeOrder}
        setTimeOrder={state.setTimeOrder}
        status={state.status}
        setStatus={state.setStatus}
      />
      <div aria-live="polite" className="sr-only">{state.total} ocorrências encontradas</div>
      <div className="mt-3" aria-busy={state.isFetching || state.searching}>
        {state.isPending || state.searching ? <p role="status" className="py-10 text-center text-sm text-muted">Carregando ocorrências…</p>
          : state.isError ? <div role="alert" className="rounded-lg border border-red-200 p-5 text-sm"><p>{state.error instanceof ApiError ? state.error.message : 'Não foi possível carregar as ocorrências.'}</p><button type="button" onClick={() => void state.refetch()} className="mt-3 font-medium text-brand-dark underline">Tentar novamente</button></div>
          : <IncidentList incidents={state.filtered} onOpen={(incident: Incident) => setSelectedId(incident.id)} onClearFilters={state.clearFilters} />}
        {!state.isPending && !state.isError && !state.searching && state.total > 100 && <nav aria-label="Paginação de ocorrências" className="mt-5 flex items-center justify-end gap-4 text-sm">
          <button type="button" disabled={state.page <= 1} onClick={() => state.setPage(state.page - 1)} className="rounded-md border border-line px-3 py-2 hover:bg-canvas disabled:opacity-40">Anterior</button>
          <span aria-live="polite">Página {state.page} de {Math.ceil(state.total / 100)}</span>
          <button type="button" disabled={state.page >= Math.ceil(state.total / 100)} onClick={() => state.setPage(state.page + 1)} className="rounded-md border border-line px-3 py-2 hover:bg-canvas disabled:opacity-40">Próxima</button>
        </nav>}
      </div>
    </section>
    {selectedId && (selected ? <IncidentDetailsModal incident={selected} readOnly={driverView} onClose={() => setSelectedId(null)} /> : <Modal title="Detalhes da ocorrência" sidePanel onClose={() => setSelectedId(null)}>
      {detail.isError ? <div role="alert"><p className="text-sm text-muted">Não foi possível carregar os detalhes.</p><button type="button" onClick={() => void detail.refetch()} className="mt-3 text-sm text-brand-dark underline">Tentar novamente</button></div> : <p role="status" className="text-sm text-muted">Carregando ocorrência…</p>}
    </Modal>)}
    {formOpen && <IncidentFormModal driverId={driverView ? user?.id : undefined} onSave={handleSave} onClose={() => setFormOpen(false)} />}
  </>
}

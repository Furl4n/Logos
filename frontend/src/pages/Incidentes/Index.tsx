import { useState } from 'react'
import type { CreateIncidentInput, Incident } from '../../interfaces/Incident'
import { useIncidents } from '../../hooks/useIncidents'
import Icon from '../../components/ui/Icons'
import IncidentFormModal from '../../components/incident/IncidentFormModal'
import IncidentDetailsModal from '../../components/incident/IncidentDetailsModal'
import IncidentToolbar from './IncidentToolbar'
import IncidentList from './IncidentList'
import IncidentHeader from './IncidentHeader'
import { currentDriver } from '../../service/mockDrivers'
import { useDemoProfile } from '../../hooks/useDemoProfile'

export default function Incidentes() {
  const { profile } = useDemoProfile()
  return <IncidentPage key={profile} driverView={profile === 'driver'} />
}

function IncidentPage({ driverView }: { driverView: boolean }) {
  const state = useIncidents(driverView ? currentDriver.id : undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = state.incidents.find(incident => incident.id === selectedId)
  const [formOpen, setFormOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  function handleSave(input: CreateIncidentInput) {
    const incident = state.createIncident(input)
    state.clearFilters()
    state.setTimeOrder('newest')
    setFormOpen(false)
    setSuccessMessage(`${incident.id} registrado com sucesso.`)
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
      <div aria-live="polite" className="sr-only">{state.filtered.length} ocorrências encontradas</div>
      <div className="mt-3">
        <IncidentList incidents={state.filtered} onOpen={(incident: Incident) => setSelectedId(incident.id)} onClearFilters={state.clearFilters} />
      </div>
    </section>
    {selected && <IncidentDetailsModal incident={selected} readOnly={driverView} onClose={() => setSelectedId(null)} />}
    {formOpen && <IncidentFormModal driverId={driverView ? currentDriver.id : undefined} onSave={handleSave} onClose={() => setFormOpen(false)} />}
  </>
}

import { useState } from 'react'
import type { Incident } from '../../interfaces/Incident'
import { useIncidents } from '../../hooks/useIncidents'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import IncidentDetailsModal from '../../components/incident/IncidentDetailsModal'
import IncidentToolbar from './IncidentToolbar'
import IncidentList from './IncidentList'
import IncidentHeader from './IncidentHeader'

export default function Incidentes() {
  const state = useIncidents()
  const [selected, setSelected] = useState<Incident | null>(null)
  const [showNotice, setShowNotice] = useState(false)
  return <>
    <IncidentHeader onAdd={() => setShowNotice(true)} />
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
        <IncidentList incidents={state.filtered} onOpen={setSelected} onClearFilters={state.clearFilters} />
      </div>
    </section>
    {selected && <IncidentDetailsModal incident={selected} onClose={() => setSelected(null)} />}
    {showNotice && <Modal title="Registro de incidente" caption="PRÓXIMA ETAPA" onClose={() => setShowNotice(false)}><p className="mb-7 text-sm leading-relaxed text-muted">O formulário de registro será a próxima tela. Nesta versão inicial, explore a fila, os filtros e as informações das ocorrências.</p><Button onClick={() => setShowNotice(false)}>Voltar para a central</Button></Modal>}
  </>
}

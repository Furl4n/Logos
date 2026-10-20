import { useState } from 'react'
import type { Incident, IncidentStatus, Severity, UpdateIncidentInput } from '../../interfaces/Incident'
import { incidentStatuses, isIncidentClosed } from '../../interfaces/Incident'
import { useIncidentAttendance } from '../../hooks/useIncidentAttendance'
import { useCurrentUser } from '../../hooks/useAuth'
import { useAnalysts } from '../../hooks/useUsers'
import { ApiError } from '../../service/api'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import FormSelect from '../ui/FormSelect'
import IncidentReopen from './IncidentReopen'

const statusOptions = incidentStatuses.map(value => ({ value, label: value }))
const severityOptions = ['Alta', 'Média', 'Baixa'].map(value => ({ value, label: value }))

export default function IncidentAttendance({ incident }: { incident: Incident }) {
  const { updateIncident, isPending } = useIncidentAttendance()
  const { data: user } = useCurrentUser()
  const [snapshot, setSnapshot] = useState(incident)
  const [status, setStatus] = useState(incident.status)
  const [severity, setSeverity] = useState(incident.severity)
  const [observation, setObservation] = useState('')
  const [transferring, setTransferring] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [observationError, setObservationError] = useState('')
  const closed = isIncidentClosed(incident.status)
  const canEdit = !closed && user?.role === 'ANALYST' && incident.analystId === user.id
  const analystQuery = useAnalysts(transferring && canEdit)
  const analystOptions = (analystQuery.data ?? []).filter(analyst => analyst.id !== user?.id).map(analyst => ({ value: analyst.id, label: analyst.name }))
  const changed = status !== snapshot.status || severity !== snapshot.severity || Boolean(observation.trim())

  function reset(updated: Incident) {
    setSnapshot(updated)
    setStatus(updated.status)
    setSeverity(updated.severity)
    setObservation('')
    setTransferring(false)
    setTargetId('')
    setConflict(false)
    setError('')
    setObservationError('')
  }

  async function commit(input: UpdateIncidentInput, success: string) {
    if (isPending) return
    setMessage('')
    setError('')
    try {
      const updated = await updateIncident(incident.id, input)
      reset(updated)
      setMessage(success)
    } catch (error) {
      const isConflict = error instanceof ApiError && error.status === 409
      setConflict(isConflict)
      setError(isConflict ? 'Esta ocorrência foi alterada. Recarregue os dados antes de tentar novamente.'
        : error instanceof ApiError ? error.message : 'Não foi possível atualizar o atendimento. Tente novamente.')
    }
  }

  return <section className="border-t border-line pt-4" aria-labelledby="attendance-title" aria-busy={isPending}>
    <fieldset disabled={isPending} className="min-w-0">
    <h3 id="attendance-title" className="mb-4 text-lg font-bold text-ink">Atendimento</h3>
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <div><span className="text-sm font-medium text-ink">Responsável</span><p className="mt-1 text-sm text-muted">{incident.assigneeName ?? 'Não atribuído'}</p></div>
      {!incident.analystId && !closed && <button type="button" disabled={conflict} onClick={() => commit({ action: 'assume', version: snapshot.version ?? 1 }, 'Atendimento assumido com sucesso.')} className="rounded-md border border-line px-3 py-2 font-medium text-brand-dark hover:bg-brand-soft disabled:opacity-50">Assumir ocorrência</button>}
      {canEdit && <button type="button" disabled={changed || conflict} onClick={() => { setTransferring(!transferring); setTargetId(''); setMessage('') }} className="rounded-md border border-line px-3 py-2 font-medium text-brand-dark hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50">{transferring ? 'Cancelar transferência' : 'Transferir'}</button>}
    </div>
    {closed ? <IncidentReopen incident={incident} onReopened={updated => { reset(updated); setMessage('Ocorrência reaberta e atribuída a você.') }} /> : canEdit ? transferring ? <form className="space-y-3" onSubmit={event => {
      event.preventDefault()
      if (targetId) commit({ action: 'transfer', version: snapshot.version ?? 1, analystId: targetId }, 'Atendimento transferido com sucesso.')
    }}>
      <FormField id="transfer-analyst" label="Novo responsável" showRequiredIndicator={false}>
        {analystQuery.isPending && <p role="status" className="mb-2 text-sm text-muted">Carregando analistas…</p>}
        {analystQuery.isError && <p role="alert" className="mb-2 text-sm text-red-700">Não foi possível carregar os analistas. <button type="button" onClick={() => void analystQuery.refetch()} className="underline">Tentar novamente</button></p>}
        <FormSelect id="transfer-analyst" variant="field" label="Novo responsável" ariaLabel="Novo responsável" value={targetId} options={analystOptions} onChange={setTargetId} placeholder="Selecione um analista" required />
      </FormField>
      <div className="flex justify-end"><Button type="submit" disabled={!targetId || conflict || !analystQuery.isSuccess} className="disabled:cursor-not-allowed disabled:opacity-50">Confirmar transferência</Button></div>
    </form> : <form noValidate onSubmit={event => {
      event.preventDefault()
      setObservationError('')
      if (isIncidentClosed(status) && !observation.trim()) {
        setObservationError(status === 'Inconclusivo' ? 'Explique por que o atendimento foi inconclusivo.' : 'Descreva o resultado do atendimento.')
        return
      }
      commit({ action: 'update', version: snapshot.version ?? 1, status, severity, observation }, 'Atendimento atualizado com sucesso.')
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField id="attendance-status" label="Status" showRequiredIndicator={false}><FormSelect id="attendance-status" variant="field" label="Status" ariaLabel="Status" value={status} options={statusOptions} onChange={value => { setStatus(value as IncidentStatus); setObservationError(''); setMessage('') }} /></FormField>
        <FormField id="attendance-severity" label="Criticidade" showRequiredIndicator={false}><FormSelect id="attendance-severity" variant="field" label="Criticidade" ariaLabel="Criticidade" value={severity} options={severityOptions} onChange={value => { setSeverity(value as Severity); setMessage('') }} /></FormField>
      </div>
      <FormField id="attendance-observation" label="Observações do atendimento" optional={!isIncidentClosed(status)} showRequiredIndicator={false} error={observationError}>
        <textarea id="attendance-observation" value={observation} onChange={event => { setObservation(event.target.value); setObservationError(''); setMessage('') }} required={isIncidentClosed(status)} aria-invalid={Boolean(observationError)} aria-describedby={observationError ? 'attendance-observation-error' : undefined} rows={3} placeholder="Adicione uma atualização ao histórico do atendimento." className="w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted aria-invalid:border-red-500" />
      </FormField>
      <div className="flex justify-end"><Button type="submit" disabled={!changed || conflict} className="disabled:cursor-not-allowed disabled:opacity-50">Salvar atualização</Button></div>
    </form> : incident.analystId ? <p className="text-sm text-muted">Somente o responsável pode alterar este atendimento.</p> : null}
    {error && <div role="alert" className="mt-3 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">{error}{conflict && <button type="button" onClick={() => { reset(incident); setMessage('Dados atualizados. Revise antes de salvar novamente.') }} className="mt-2 block font-semibold underline">Recarregar dados e descartar edição</button>}</div>}
    {message && <p role="status" className="mt-3 text-sm text-green-800">{message}</p>}
    {isPending && <p role="status" className="mt-3 text-sm text-muted">Salvando atendimento…</p>}
    </fieldset>
  </section>
}

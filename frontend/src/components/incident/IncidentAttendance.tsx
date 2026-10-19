import { useState } from 'react'
import type { Incident, IncidentStatus, Severity } from '../../interfaces/Incident'
import { useIncidentStore } from '../../hooks/useIncidentStore'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import FormSelect from '../ui/FormSelect'
import IncidentReopen from './IncidentReopen'

const statusOptions = [
  { value: 'Aberto', label: 'Aberto' },
  { value: 'Em andamento', label: 'Andamento' },
  { value: 'Resolvido', label: 'Resolvido' },
]
const severityOptions = ['Alta', 'Média', 'Baixa'].map(value => ({ value, label: value }))

export default function IncidentAttendance({ incident }: { incident: Incident }) {
  const { updateIncident } = useIncidentStore()
  // Keep the version read when editing; a newer store value must not overwrite a draft.
  const [snapshot, setSnapshot] = useState(incident)
  const [status, setStatus] = useState(incident.status)
  const [severity, setSeverity] = useState(incident.severity)
  const [resolution, setResolution] = useState(incident.resolution ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [resolutionError, setResolutionError] = useState('')
  const changed = status !== snapshot.status || severity !== snapshot.severity || resolution.trim() !== (snapshot.resolution ?? '')

  function reload() {
    setSnapshot(incident)
    setStatus(incident.status)
    setSeverity(incident.severity)
    setResolution(incident.resolution ?? '')
    setConflict(false)
    setError('')
    setMessage('Dados atualizados. Revise antes de salvar novamente.')
    setResolutionError('')
  }

  function save(assume = false) {
    setMessage('')
    setError('')
    setResolutionError('')
    if (!assume && status === 'Resolvido' && !resolution.trim()) {
      setResolutionError('Descreva o resultado do atendimento.')
      return
    }
    const result = updateIncident(incident.id, {
      version: snapshot.version ?? 1,
      status: assume ? 'Em andamento' : status,
      severity: assume ? snapshot.severity : severity,
      resolution: assume ? snapshot.resolution ?? '' : resolution,
      assume,
    })
    if (!result.ok) {
      setConflict(result.reason === 'conflict')
      setError(result.reason === 'conflict' ? 'Esta ocorrência foi alterada desde a abertura. Recarregue os dados antes de tentar novamente.' : 'Não foi possível atualizar o atendimento. Confira os dados.')
      return
    }
    setSnapshot(result.incident)
    if (assume) setStatus(result.incident.status)
    setMessage(assume ? 'Atendimento assumido com sucesso.' : 'Ocorrência atualizada com sucesso.')
  }

  return <section className="border-t border-line pt-4" aria-labelledby="attendance-title">
    <h3 id="attendance-title" className="mb-4 text-lg font-bold text-ink">Atendimento</h3>
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <div><span className="text-sm font-medium text-ink">Responsável</span><p className="mt-1 text-sm text-muted">{incident.analyst ?? 'Não atribuído'}</p></div>
      {!incident.analyst && incident.status !== 'Resolvido' && <button type="button" disabled={conflict || changed} onClick={() => save(true)} className="rounded-md border border-line px-3 py-2 font-medium text-brand-dark hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50">Assumir ocorrência</button>}
    </div>
    {incident.status === 'Resolvido' ? <IncidentReopen incident={incident} onReopened={updated => {
      setSnapshot(updated)
      setStatus(updated.status)
      setSeverity(updated.severity)
      setResolution(updated.resolution ?? '')
      setMessage('Ocorrência reaberta com sucesso.')
      setError('')
      setConflict(false)
      setResolutionError('')
    }} /> : <form noValidate onSubmit={event => { event.preventDefault(); save() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField id="attendance-status" label="Status" showRequiredIndicator={false}><FormSelect id="attendance-status" variant="field" label="Status" ariaLabel="Status" value={status} options={statusOptions} onChange={value => { setStatus(value as IncidentStatus); setMessage('') }} /></FormField>
        <FormField id="attendance-severity" label="Criticidade" showRequiredIndicator={false}><FormSelect id="attendance-severity" variant="field" label="Criticidade" ariaLabel="Criticidade" value={severity} options={severityOptions} onChange={value => { setSeverity(value as Severity); setMessage('') }} /></FormField>
      </div>
      <FormField id="attendance-resolution" label="Observações do atendimento" optional={status !== 'Resolvido'} showRequiredIndicator={false} error={resolutionError}>
        <textarea id="attendance-resolution" value={resolution} onChange={event => { setResolution(event.target.value); setResolutionError(''); setMessage('') }} required={status === 'Resolvido'} aria-invalid={Boolean(resolutionError)} aria-describedby={resolutionError ? 'attendance-resolution-error' : undefined} rows={3} placeholder="Descreva as ações realizadas e o resultado do atendimento." className="w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted aria-invalid:border-red-500" />
      </FormField>
      {error && <div role="alert" className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700">{error}{conflict && <button type="button" onClick={reload} className="mt-2 block font-semibold underline">Recarregar dados e descartar edição</button>}</div>}
      <div className="flex justify-end"><Button type="submit" disabled={!changed || conflict} className="disabled:cursor-not-allowed disabled:opacity-50">Salvar alterações</Button></div>
    </form>}
    {message && <p role="status" className="mt-3 text-sm text-green-800">{message}</p>}
  </section>
}

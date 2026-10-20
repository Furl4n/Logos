import { useState } from 'react'
import type { Incident } from '../../interfaces/Incident'
import { useIncidentAttendance } from '../../hooks/useIncidentAttendance'
import { ApiError } from '../../service/api'
import Button from '../ui/Button'
import FormField from '../ui/FormField'

export default function IncidentReopen({ incident, onReopened }: { incident: Incident; onReopened: (incident: Incident) => void }) {
  const { updateIncident, refreshIncident, isPending } = useIncidentAttendance()
  const [refreshing, setRefreshing] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [version, setVersion] = useState(incident.version ?? 1)

  return <fieldset disabled={isPending || refreshing} className="min-w-0 space-y-4" aria-busy={isPending || refreshing}>
    {!editing ? <Button onClick={() => setEditing(true)}>Reabrir ocorrência</Button> : <form noValidate className="space-y-3" onSubmit={async event => {
      event.preventDefault()
      if (isPending || refreshing || blocked) return
      setConflict(false)
      setError('')
      if (!reason.trim()) { setError('Informe por que a ocorrência precisa ser reaberta.'); return }
      try {
        const updated = await updateIncident(incident.id, { version, action: 'reopen', reason })
        onReopened(updated)
      } catch (error) {
        const isConflict = error instanceof ApiError && error.status === 409
        setConflict(isConflict)
        setError(isConflict ? 'Sua alteração não foi salva porque esta ocorrência foi atualizada por outro atendimento.' : error instanceof ApiError ? error.message : 'Não foi possível reabrir a ocorrência. Tente novamente.')
        if (isConflict) {
          setBlocked(true)
          setRefreshing(true)
          try {
            const latest = await refreshIncident(incident.id)
            setVersion(latest.version ?? 1)
            setBlocked(false)
          } catch {
            // Não libera uma nova tentativa usando uma versão desatualizada.
          } finally {
            setRefreshing(false)
          }
        }
      }
    }}>
      <FormField id="reopen-reason" label="Justificativa da reabertura" showRequiredIndicator={false} error={conflict ? undefined : error}>
        <textarea id="reopen-reason" autoFocus required value={reason} onChange={event => { setReason(event.target.value); if (!conflict) setError('') }} aria-invalid={Boolean(error) && !conflict} aria-describedby={error && !conflict ? 'reopen-reason-error' : undefined} rows={3} className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink aria-invalid:border-danger" placeholder="Explique o que precisa ser revisto ou atendido." />
      </FormField>
      {conflict && <div role="alert" className="text-sm text-danger">{error}</div>}
      <div className="flex justify-end gap-3">
        <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => { setEditing(false); setReason(''); setError(''); setConflict(false); setBlocked(false); setVersion(incident.version ?? 1) }}>Cancelar</button>
        <Button type="submit" disabled={blocked} className="disabled:cursor-not-allowed disabled:opacity-50">{refreshing ? 'Atualizando dados…' : isPending ? 'Reabrindo…' : 'Confirmar reabertura'}</Button>
      </div>
    </form>}
  </fieldset>
}

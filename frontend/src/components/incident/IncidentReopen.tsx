import { useState } from 'react'
import type { Incident } from '../../interfaces/Incident'
import { useIncidentAttendance } from '../../hooks/useIncidentAttendance'
import { ApiError } from '../../service/api'
import Button from '../ui/Button'
import FormField from '../ui/FormField'

export default function IncidentReopen({ incident, onReopened }: { incident: Incident; onReopened: (incident: Incident) => void }) {
  const { updateIncident, isPending } = useIncidentAttendance()
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [version, setVersion] = useState(incident.version ?? 1)

  return <fieldset disabled={isPending} className="min-w-0 space-y-4" aria-busy={isPending}>
    {!editing ? <Button onClick={() => setEditing(true)}>Reabrir ocorrência</Button> : <form noValidate className="space-y-3" onSubmit={async event => {
      event.preventDefault()
      if (isPending) return
      if (!reason.trim()) { setError('Informe por que a ocorrência precisa ser reaberta.'); return }
      try {
        const updated = await updateIncident(incident.id, { version, action: 'reopen', reason })
        onReopened(updated)
      } catch (error) {
        const isConflict = error instanceof ApiError && error.status === 409
        setConflict(isConflict)
        setError(isConflict ? 'Esta ocorrência foi alterada. Recarregue os dados antes de tentar novamente.' : error instanceof ApiError ? error.message : 'Não foi possível reabrir a ocorrência. Tente novamente.')
      }
    }}>
      <FormField id="reopen-reason" label="Justificativa da reabertura" showRequiredIndicator={false} error={conflict ? undefined : error}>
        <textarea id="reopen-reason" autoFocus required value={reason} onChange={event => { setReason(event.target.value); if (!conflict) setError('') }} aria-invalid={Boolean(error) && !conflict} aria-describedby={error && !conflict ? 'reopen-reason-error' : undefined} rows={3} className="w-full resize-y rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink aria-invalid:border-red-500" placeholder="Explique o que precisa ser revisto ou atendido." />
      </FormField>
      {conflict && <div role="alert" className="text-sm text-red-700">{error}<button type="button" className="mt-2 block font-semibold underline" onClick={() => { setVersion(incident.version ?? 1); setReason(''); setError(''); setConflict(false) }}>Recarregar dados e descartar edição</button></div>}
      <div className="flex justify-end gap-3">
        <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-medium" onClick={() => { setEditing(false); setReason(''); setError(''); setConflict(false); setVersion(incident.version ?? 1) }}>Cancelar</button>
        <Button type="submit" disabled={conflict} className="disabled:cursor-not-allowed disabled:opacity-50">{isPending ? 'Reabrindo…' : 'Confirmar reabertura'}</Button>
      </div>
    </form>}
  </fieldset>
}

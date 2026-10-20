import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { CreateIncidentInput, Severity } from '../../interfaces/Incident'
import { incidentCategories } from '../../interfaces/Incident'
import { useDrivers } from '../../hooks/useUsers'
import { useCurrentUser } from '../../hooks/useAuth'
import { ApiError } from '../../service/api'
import Button from '../ui/Button'
import FormField from '../ui/FormField'
import FormSelect from '../ui/FormSelect'
import DateTimePicker from '../ui/DateTimePicker'

type FormValues = Omit<CreateIncidentInput, 'severity'> & { severity: Severity | '' }
type FormErrors = Partial<Record<keyof FormValues, string>>

const categoryOptions = incidentCategories.map(value => ({ value, label: value }))
const severityOptions = ['Alta', 'Média', 'Baixa'].map(value => ({ value, label: value }))

function localDateTime() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export default function IncidentForm({ onSave, onCancel, driverId }: { onSave: (input: CreateIncidentInput) => void | Promise<void>; onCancel: () => void; driverId?: string }) {
  const { data: user } = useCurrentUser()
  const driverQuery = useDrivers(!driverId)
  const drivers = driverQuery.data ?? []
  const driverOptions = drivers.map(driver => ({ value: driver.id, label: driver.name }))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const prefix = useId()
  const [values, setValues] = useState<FormValues>({ title: '', description: '', driverId: driverId ?? '', plate: '', location: '', route: '', occurredAt: localDateTime(), category: '', severity: '' })
  const [errors, setErrors] = useState<FormErrors>({})

  function update(field: keyof FormValues, value: string) {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaveError('')
    const nextErrors: FormErrors = {}
    if (!values.title.trim()) nextErrors.title = 'Informe um título para a ocorrência.'
    else if (values.title.trim().length > 160) nextErrors.title = 'Use até 160 caracteres.'
    if (!values.description.trim()) nextErrors.description = 'Descreva o que aconteceu.'
    if (!driverId && !drivers.some(driver => driver.id === values.driverId)) nextErrors.driverId = 'Selecione um motorista cadastrado.'
    if (!incidentCategories.includes(values.category)) nextErrors.category = 'Selecione a categoria.'
    if (!['Alta', 'Média', 'Baixa'].includes(values.severity)) nextErrors.severity = 'Selecione a criticidade.'
    if (!values.plate.trim()) nextErrors.plate = 'Informe a placa ou o identificador do caminhão.'
    else if (values.plate.trim().length > 10) nextErrors.plate = 'Use até 10 caracteres.'
    if (!values.location.trim()) nextErrors.location = 'Informe onde ocorreu o incidente.'
    if (values.route.trim().length > 50) nextErrors.route = 'Use até 50 caracteres.'
    const occurredAt = new Date(values.occurredAt)
    if (!values.occurredAt || !Number.isFinite(occurredAt.getTime())) nextErrors.occurredAt = 'Informe uma data e hora válidas.'
    else if (occurredAt.getTime() > Date.now()) nextErrors.occurredAt = 'A ocorrência não pode estar no futuro.'
    setErrors(nextErrors)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      document.getElementById(`${prefix}-${firstInvalid}`)?.focus()
      return
    }
    setSaving(true)
    try { await onSave({
      ...values, driverId: driverId ?? values.driverId,
      title: values.title.trim(), description: values.description.trim(),
      plate: values.plate.trim().toUpperCase(), location: values.location.trim(),
      route: values.route.trim(), severity: values.severity as Severity,
      occurredAt: occurredAt.toISOString(),
    }) } catch (error) {
      setSaveError(error instanceof ApiError ? error.message : 'Não foi possível registrar a ocorrência. Tente novamente.')
    } finally { setSaving(false) }
  }

  const inputClass = 'h-10 w-full min-w-0 rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-muted hover:border-slate-400 aria-invalid:border-red-500'
  function fieldProps(field: keyof FormValues) {
    return {
      id: `${prefix}-${field}`,
      name: field,
      value: values[field],
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? `${prefix}-${field}-error` : undefined,
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={saving} className="min-w-0">
        <div className="space-y-4">
          <FormField id={`${prefix}-title`} label="Título" error={errors.title}>
            <input {...fieldProps('title')} onChange={event => update('title', event.target.value)} className={inputClass} maxLength={160} required placeholder="Ex.: Falha no sistema de freios" />
          </FormField>
          <FormField id={`${prefix}-description`} label="Descrição" error={errors.description}>
            <textarea {...fieldProps('description')} onChange={event => update('description', event.target.value)} className={`${inputClass} h-auto min-h-24 resize-y py-2.5`} rows={3} required placeholder="Descreva a situação e as informações relevantes para o atendimento." />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${prefix}-category`} label="Categoria" error={errors.category}>
              <FormSelect id={`${prefix}-category`} variant="field" label="Categoria" ariaLabel="Categoria" value={values.category} options={categoryOptions} onChange={value => update('category', value)} placeholder="Selecione a categoria" required invalid={Boolean(errors.category)} describedBy={errors.category ? `${prefix}-category-error` : undefined} />
            </FormField>
            <FormField id={`${prefix}-severity`} label="Criticidade" error={errors.severity}>
              <FormSelect id={`${prefix}-severity`} variant="field" label="Criticidade" ariaLabel="Criticidade" value={values.severity} options={severityOptions} onChange={value => update('severity', value)} placeholder="Selecione a criticidade" required invalid={Boolean(errors.severity)} describedBy={errors.severity ? `${prefix}-severity-error` : undefined} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${prefix}-occurredAt`} label="Data e hora da ocorrência" error={errors.occurredAt}>
              <DateTimePicker id={`${prefix}-occurredAt`} value={values.occurredAt} onChange={value => update('occurredAt', value)} invalid={Boolean(errors.occurredAt)} describedBy={errors.occurredAt ? `${prefix}-occurredAt-error` : undefined} />
            </FormField>
            <FormField id={`${prefix}-location`} label="Localização" error={errors.location}>
              <input {...fieldProps('location')} onChange={event => update('location', event.target.value)} className={inputClass} required placeholder="Ex.: BR-116, km 214 · Curitiba, PR" />
            </FormField>
          </div>
          {driverId ? <div className="text-sm"><span className="text-muted">Motorista</span><p className="mt-1 font-medium">{user?.name}</p></div> : <FormField id={`${prefix}-driverId`} label="Motorista" error={errors.driverId}>
            {driverQuery.isPending && <p role="status" className="mb-2 text-sm text-muted">Carregando motoristas…</p>}
            {driverQuery.isError && <p role="alert" className="mb-2 text-sm text-red-700">Não foi possível carregar os motoristas. <button type="button" onClick={() => void driverQuery.refetch()} className="underline">Tentar novamente</button></p>}
            <FormSelect id={`${prefix}-driverId`} variant="field" label="Motorista" ariaLabel="Motorista" value={values.driverId} options={driverOptions} onChange={value => update('driverId', value)} placeholder="Selecione um motorista cadastrado" required invalid={Boolean(errors.driverId)} describedBy={errors.driverId ? `${prefix}-driverId-error` : undefined} />
          </FormField>}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${prefix}-plate`} label="Caminhão" error={errors.plate}>
              <input {...fieldProps('plate')} onChange={event => update('plate', event.target.value.toUpperCase())} className={inputClass} maxLength={10} required placeholder="Placa ou identificador" />
            </FormField>
            <FormField id={`${prefix}-route`} label="Rota / entrega" error={errors.route} optional>
              <input {...fieldProps('route')} onChange={event => update('route', event.target.value)} className={inputClass} maxLength={50} placeholder="Ex.: RT-0284" />
            </FormField>
          </div>
        </div>
      </fieldset>
      {saveError && <p role="alert" className="mt-3 text-sm text-red-700">{saveError}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md border border-line px-4 py-2.5 text-sm font-medium hover:border-slate-400">Cancelar</button>
        <Button type="submit" disabled={saving || (!driverId && !driverQuery.isSuccess)}>{saving ? 'Registrando…' : 'Registrar incidente'}</Button>
      </div>
    </form>
  )
}

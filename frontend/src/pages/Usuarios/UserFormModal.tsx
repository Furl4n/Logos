import { useState, type FormEvent } from 'react'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import FormSelect from '../../components/ui/FormSelect'
import Modal from '../../components/ui/Modal'
import { useCreateUser } from '../../hooks/useUserAdministration'
import { ApiError } from '../../service/api'

const inputClass = 'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base text-ink'

export default function UserFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const create = useCreateUser()
  const [role, setRole] = useState<'DRIVER' | 'ANALYST'>('DRIVER')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (create.isPending) return
    const fields = new FormData(event.currentTarget)
    setError('')
    try {
      const user = await create.mutateAsync({ name: String(fields.get('name')).trim(), email: String(fields.get('email')).trim(), password: String(fields.get('password')), role })
      onCreated(user.name)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível criar o usuário. Tente novamente.')
    }
  }

  return <Modal title="Criar usuário" onClose={() => { if (!create.isPending) onClose() }}>
    <form onSubmit={submit} aria-busy={create.isPending}>
      <fieldset disabled={create.isPending} className="space-y-4 disabled:opacity-60">
        <FormField id="user-name" label="Nome"><input id="user-name" name="name" autoComplete="name" required maxLength={150} className={inputClass} /></FormField>
        <FormField id="user-email" label="E-mail"><input id="user-email" name="email" type="email" autoComplete="off" required maxLength={255} className={inputClass} /></FormField>
        <FormSelect id="user-role" label="Cargo" ariaLabel="Cargo do usuário" variant="field" required value={role} onChange={value => setRole(value as 'DRIVER' | 'ANALYST')} options={[{ value: 'DRIVER', label: 'Motorista' }, { value: 'ANALYST', label: 'Analista' }]} />
        <FormField id="user-password" label="Senha">
          <div className="relative"><input id="user-password" name="password" type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" aria-describedby="user-password-help" className={`${inputClass} pr-23`} /><button type="button" aria-controls="user-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-1 px-3 text-sm text-muted">{showPassword ? 'Ocultar' : 'Mostrar'}</button></div>
          <p id="user-password-help" className="mt-1 text-sm text-muted">Mínimo de 8 caracteres.</p>
        </FormField>
        {error && <p role="alert" className="rounded-md border border-danger-line px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1"><button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-muted hover:bg-canvas">Cancelar</button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Criando…' : 'Criar usuário'}</Button></div>
      </fieldset>
    </form>
  </Modal>
}

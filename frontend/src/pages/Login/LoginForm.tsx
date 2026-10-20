import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import { useDemoProfile } from '../../hooks/useDemoProfile'

const inputClassName = 'w-full rounded-md border border-line bg-white px-3 py-3 text-base text-ink placeholder:text-muted'

export default function LoginForm() {
  const { setProfile } = useDemoProfile()
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('A autenticação ainda não está disponível. Você pode acessar a demonstração pelo link abaixo.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField id="login-email" label="E-mail" showRequiredIndicator={false}>
        <input id="login-email" name="email" type="email" autoComplete="username" placeholder="seu@email.com" required className={inputClassName} />
      </FormField>
      <FormField id="login-password" label="Senha" showRequiredIndicator={false}>
        <div className="relative">
          <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className={`${inputClassName} pr-23`} />
          <button type="button" aria-controls="login-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-1 right-1 rounded px-3 text-sm font-medium text-muted hover:text-ink">
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </FormField>
      {message && <p role="status" className="rounded-md border border-line bg-canvas px-3 py-3 text-sm text-ink">{message}</p>}
      <Button type="submit" className="w-full py-3">Entrar</Button>
      <div className="border-t border-line pt-5 text-center">
        <p className="mb-3 text-sm text-muted">Acessar demonstração</p>
        <div className="flex justify-center gap-6">
          <Link to="/incidentes" onClick={() => setProfile('analyst')} className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline">Analista</Link>
          <Link to="/incidentes" onClick={() => setProfile('driver')} className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline">Motorista</Link>
        </div>
      </div>
    </form>
  )
}

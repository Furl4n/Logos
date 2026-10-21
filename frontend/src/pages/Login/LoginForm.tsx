import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import FormField from '../../components/ui/FormField'
import { useLogin } from '../../hooks/useAuth'
import { ApiError } from '../../service/api'

const inputClassName = 'w-full rounded-md border border-line bg-surface px-3 py-3 text-base text-ink placeholder:text-muted'

export default function LoginForm() {
  const login = useLogin()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return
    const fields = new FormData(event.currentTarget)
    setMessage('')
    try {
      const result = await login.mutateAsync({ email: String(fields.get('email')).trim(), password: String(fields.get('password')) })
      navigate(result.user.role === 'ADMIN' ? '/usuarios' : '/incidentes', { replace: true })
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Não foi possível conectar ao servidor. Tente novamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={login.isPending} className="space-y-5">
      <fieldset disabled={login.isPending} className="space-y-5 disabled:opacity-70">
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
      {message && <p role="alert" className="rounded-md border border-danger-line bg-danger-soft px-3 py-3 text-sm text-danger">{message}</p>}
      <Button type="submit" disabled={login.isPending} className="w-full py-3 disabled:cursor-wait">{login.isPending ? 'Entrando…' : 'Entrar'}</Button>
      </fieldset>
    </form>
  )
}

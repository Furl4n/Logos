import { useEffect } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '../hooks/useAuth'

export default function AuthRoute({ publicOnly = false }: { publicOnly?: boolean }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useCurrentUser()

  useEffect(() => {
    function expireSession() {
      void queryClient.cancelQueries()
      queryClient.removeQueries({ predicate: query => query.queryKey[0] !== 'auth' })
      queryClient.setQueryData(['auth', 'me'], null)
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:expired', expireSession)
    return () => window.removeEventListener('auth:expired', expireSession)
  }, [navigate, queryClient])

  if (session.isPending) return <main role="status" className="grid min-h-dvh place-items-center text-muted">Carregando…</main>
  if (session.isError) return (
    <main className="grid min-h-dvh place-content-center gap-4 px-6 text-center">
      <p role="alert">Não foi possível verificar sua sessão. Confira sua conexão.</p>
      <button type="button" onClick={() => void session.refetch()} className="text-brand-dark underline">Tentar novamente</button>
    </main>
  )
  if (publicOnly) return session.data ? <Navigate to="/incidentes" replace /> : <Outlet />
  return session.data ? <Outlet /> : <Navigate to="/login" replace />
}

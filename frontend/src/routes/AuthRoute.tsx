import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useAuth'

export default function AuthRoute({ publicOnly = false }: { publicOnly?: boolean }) {
  const session = useCurrentUser()
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

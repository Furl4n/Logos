import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useAuth'

export default function RoleRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { data: user } = useCurrentUser()
  if (!user) return null
  const admin = user.role === 'ADMIN'
  return admin === adminOnly ? <Outlet /> : <Navigate to={admin ? '/usuarios' : '/incidentes'} replace />
}

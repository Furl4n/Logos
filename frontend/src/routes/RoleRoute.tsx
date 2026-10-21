import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useAuth'

export default function RoleRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { data: user } = useCurrentUser()
  if (!user) return null
  const admin = user.role === 'ADMIN'
  return !adminOnly || admin ? <Outlet /> : <Navigate to="/incidentes" replace />
}

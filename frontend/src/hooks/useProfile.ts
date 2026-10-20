import { useCurrentUser } from './useAuth'

export function useProfile() {
  const { data: user } = useCurrentUser()
  return { profile: user?.role === 'DRIVER' ? 'driver' as const : 'analyst' as const }
}

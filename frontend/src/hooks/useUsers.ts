import { useQuery } from '@tanstack/react-query'
import type { UserReference } from '../interfaces/Api'
import { api } from '../service/api'

export function useDrivers(enabled: boolean) {
  return useQuery({ queryKey: ['users', 'drivers'], queryFn: ({ signal }) => api<UserReference[]>('/users/drivers', { signal }), enabled })
}

export function useAnalysts(enabled: boolean) {
  return useQuery({ queryKey: ['users', 'analysts'], queryFn: ({ signal }) => api<UserReference[]>('/users/analysts', { signal }), enabled })
}

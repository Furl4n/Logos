import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateUserRequest, ManagedUser, UserPage, UserStatusFilter } from '../interfaces/Api'
import { api } from '../service/api'

export function useManagedUsers(search: string, page: number, status: UserStatusFilter) {
  return useQuery({
    queryKey: ['users', 'administration', search, page, status],
    queryFn: ({ signal }) => api<UserPage>(`/users?${new URLSearchParams({ search, page: String(page), pageSize: '20', status })}`, { signal }),
  })
}

export function useCreateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => api<ManagedUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUserStatus() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api<ManagedUser>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['users'] }),
  })
}

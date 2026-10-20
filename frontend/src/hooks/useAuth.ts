import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthUser, LoginRequest, LoginResponse } from '../interfaces/Api'
import { api, ApiError } from '../service/api'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async ({ signal }) => {
      try {
        return await api<AuthUser>('/auth/me', { signal })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: false,
  })
}

export function useLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (data: LoginRequest) => api<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: async (data) => {
      await client.cancelQueries()
      client.clear()
      client.setQueryData(['auth', 'me'], data.user)
    },
  })
}

export function useLogout() {
  const client = useQueryClient()
  return async () => {
    await api<void>('/auth/logout', { method: 'POST' })
    await client.cancelQueries()
    client.clear()
    client.setQueryData(['auth', 'me'], null)
  }
}

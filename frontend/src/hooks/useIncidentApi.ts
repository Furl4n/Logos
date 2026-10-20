import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssignIncidentRequest, CreateIncidentRequest, IncidentDetail, IncidentFilters, IncidentPage, ReopenIncidentRequest, UpdateIncidentRequest } from '../interfaces/Api'
import { api, ApiError } from '../service/api'

function incidentListPath(filters: IncidentFilters) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return `/incidents?${params}`
}

export function useIncidentList(filters: IncidentFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['incidents', 'list', filters],
    queryFn: ({ signal }) => api<IncidentPage>(incidentListPath(filters), { signal }),
    enabled,
  })
}

export function useInfiniteIncidentList(filters: Omit<IncidentFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['incidents', 'list', 'infinite', filters],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) => api<IncidentPage>(incidentListPath({ ...filters, page: pageParam }), { signal }),
    getNextPageParam: last => last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  })
}

export function useIncidentDetails(id: string | null) {
  return useQuery({
    queryKey: ['incidents', 'detail', id],
    queryFn: ({ signal }) => api<IncidentDetail>(`/incidents/${id}`, { signal }),
    enabled: Boolean(id),
  })
}

function useIncidentMutation<T>(mutationFn: (data: T) => Promise<IncidentDetail>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async (incident) => {
      await client.cancelQueries({ queryKey: ['incidents', 'detail', incident.id] })
      client.setQueryData(['incidents', 'detail', incident.id], incident)
      await client.invalidateQueries({ queryKey: ['incidents', 'list'] })
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 409 && error.data.currentIncident) {
        const current = error.data.currentIncident
        await client.cancelQueries({ queryKey: ['incidents', 'detail', current.id] })
        client.setQueryData(['incidents', 'detail', current.id], current)
        await client.invalidateQueries({ queryKey: ['incidents', 'list'] })
      }
    },
  })
}

export function useCreateIncident() {
  return useIncidentMutation((data: CreateIncidentRequest) => api<IncidentDetail>('/incidents', { method: 'POST', body: JSON.stringify(data) }))
}

export function useUpdateIncident() {
  return useIncidentMutation(({ id, ...data }: UpdateIncidentRequest & { id: string }) => api<IncidentDetail>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }))
}

export function useAssignIncident() {
  return useIncidentMutation(({ id, ...data }: AssignIncidentRequest & { id: string }) => api<IncidentDetail>(`/incidents/${id}/assignee`, { method: 'PATCH', body: JSON.stringify(data) }))
}

export function useReopenIncident() {
  return useIncidentMutation(({ id, ...data }: ReopenIncidentRequest & { id: string }) => api<IncidentDetail>(`/incidents/${id}/reopen`, { method: 'POST', body: JSON.stringify(data) }))
}

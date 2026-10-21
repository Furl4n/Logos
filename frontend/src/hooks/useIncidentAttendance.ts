import { useCurrentUser } from './useAuth'
import { useQueryClient } from '@tanstack/react-query'
import type { IncidentDetail } from '../interfaces/Api'
import { api } from '../service/api'
import { useAssignIncident, useReopenIncident, useUpdateIncident } from './useIncidentApi'
import type { UpdateIncidentInput } from '../interfaces/Incident'
import { enumValue, severityLabels, statusLabels, toIncidentDetail } from '../service/incidentMapper'

export function useIncidentAttendance() {
  const client = useQueryClient()
  const { data: user } = useCurrentUser()
  const assign = useAssignIncident()
  const update = useUpdateIncident()
  const reopen = useReopenIncident()

  async function updateIncident(id: string, input: UpdateIncidentInput) {
    if (!user || user.role === 'DRIVER') throw new Error('Acesso exclusivo para analistas e administradores.')
    const version = input.version
    switch (input.action) {
      case 'assume': return toIncidentDetail(await assign.mutateAsync({ id, version, analystId: user.id }))
      case 'transfer': return toIncidentDetail(await assign.mutateAsync({ id, version, analystId: input.analystId }))
      case 'reopen': return toIncidentDetail(await reopen.mutateAsync({ id, version, reason: input.reason }))
      case 'update': {
        const status = enumValue(statusLabels, input.status)
        const severity = enumValue(severityLabels, input.severity)
        if (!status || !severity) throw new Error('Confira status e criticidade.')
        return toIncidentDetail(await update.mutateAsync({ id, version, status, severity, observation: input.observation.trim() || null }))
      }
    }
  }

  async function refreshIncident(id: string) {
    const data = await client.fetchQuery({
      queryKey: ['incidents', 'detail', id],
      queryFn: ({ signal }) => api<IncidentDetail>(`/incidents/${id}`, { signal }),
      staleTime: 0,
    })
    return toIncidentDetail(data)
  }

  return { updateIncident, refreshIncident, isPending: assign.isPending || update.isPending || reopen.isPending }
}

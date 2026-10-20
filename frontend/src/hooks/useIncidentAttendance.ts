import { useCurrentUser } from './useAuth'
import { useAssignIncident, useReopenIncident, useUpdateIncident } from './useIncidentApi'
import type { UpdateIncidentInput } from '../interfaces/Incident'
import { enumValue, severityLabels, statusLabels, toIncidentDetail } from '../service/incidentMapper'

export function useIncidentAttendance() {
  const { data: user } = useCurrentUser()
  const assign = useAssignIncident()
  const update = useUpdateIncident()
  const reopen = useReopenIncident()

  async function updateIncident(id: string, input: UpdateIncidentInput) {
    if (!user || user.role !== 'ANALYST') throw new Error('Acesso exclusivo para analistas.')
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

  return { updateIncident, isPending: assign.isPending || update.isPending || reopen.isPending }
}

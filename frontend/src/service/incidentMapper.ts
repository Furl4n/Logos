import type { IncidentDetail, IncidentSeverity, IncidentStatus, IncidentSummary } from '../interfaces/Api'
import type { Incident } from '../interfaces/Incident'

export const severityLabels = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' } as const
export const statusLabels = { OPEN: 'Aberto', UNDER_INVESTIGATION: 'Em investigação', CLOSED: 'Fechado', INCONCLUSIVE: 'Inconclusivo' } as const
export const categoryLabels = {
  MECHANICAL_ISSUE: 'Problema mecânico', VEHICLE_ACCIDENT: 'Acidente com veículo',
  INJURY_ACCIDENT: 'Acidente com feridos', UNUSUAL_WEATHER: 'Condição climática', ROAD_BLOCK: 'Bloqueio de via',
} as const

export function enumValue<T extends string>(labels: Record<T, string>, label: string): T | undefined {
  return (Object.keys(labels) as T[]).find(key => labels[key] === label)
}

export function relativeTime(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 60_000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)} h`
  return `há ${Math.floor(minutes / 1440)} d`
}

export function toIncident(data: IncidentSummary): Incident {
  return {
    id: data.id, code: data.code, title: data.title, driver: data.driver.name, driverId: data.driver.id,
    plate: data.truckPlate, location: data.location, time: relativeTime(data.occurredAt), occurredAt: data.occurredAt,
    severity: severityLabels[data.severity], status: statusLabels[data.status], category: categoryLabels[data.category],
    version: data.version, analystId: data.assignee?.id, assigneeName: data.assignee?.name,
    description: '', route: '',
  }
}

export function toIncidentDetail(data: IncidentDetail): Incident {
  return {
    ...toIncident(data), description: data.description, route: data.routeCode ?? 'Não informada',
    history: data.history.map(entry => ({
      id: entry.id, user: entry.author.name, timestamp: entry.createdAt, observation: entry.observation ?? undefined,
      changes: entry.changes.map(change => {
        switch (change.type) {
          case 'CREATED': return 'Ocorrência registrada.'
          case 'ASSIGNEE': return `Responsável: ${change.previousAssignee?.name ?? 'Não atribuído'} → ${change.newAssignee.name}.`
          case 'SEVERITY': return `Criticidade: ${severityLabels[change.previousValue as IncidentSeverity]} → ${severityLabels[change.newValue as IncidentSeverity]}.`
          case 'STATUS': return `Status: ${statusLabels[change.previousValue as IncidentStatus]} → ${statusLabels[change.newValue as IncidentStatus]}.`
          case 'REOPEN': return 'Ocorrência reaberta.'
        }
      }),
    })),
  }
}

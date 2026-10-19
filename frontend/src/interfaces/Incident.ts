export type Severity = 'Alta' | 'Média' | 'Baixa'
export type IncidentStatus = 'Aberto' | 'Em andamento' | 'Resolvido'
export type TimeOrder = 'newest' | 'oldest'

export interface IncidentHistoryEntry {
  id: string
  user: string
  timestamp: string
  changes: string[]
}

export interface UpdateIncidentInput {
  version: number
  status: IncidentStatus
  severity: Severity
  resolution: string
  assume?: boolean
  reopenReason?: string
}

export interface Incident {
  id: string
  title: string
  driver: string
  driverId?: string
  plate: string
  location: string
  time: string
  occurredAt: string
  severity: Severity
  status: IncidentStatus
  category: string
  description: string
  route: string
  version?: number
  analyst?: string
  resolution?: string
  history?: IncidentHistoryEntry[]
}

export interface CreateIncidentInput {
  title: string
  description: string
  driverId: string
  plate: string
  location: string
  occurredAt: string
  severity: Severity
  category: string
  route: string
}

export const incidentCategories = ['Problema mecânico', 'Acidente com veículo', 'Acidente com feridos', 'Condição climática', 'Bloqueio de via']

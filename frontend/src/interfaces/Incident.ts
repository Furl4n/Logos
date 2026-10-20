export type Severity = 'Alta' | 'Média' | 'Baixa'
export const incidentStatuses = ['Aberto', 'Em investigação', 'Fechado', 'Inconclusivo'] as const
export type IncidentStatus = typeof incidentStatuses[number]
export const isIncidentClosed = (status: IncidentStatus) => status === 'Fechado' || status === 'Inconclusivo'
export type TimeOrder = 'newest' | 'oldest'

export interface IncidentHistoryEntry {
  id: string
  user: string
  timestamp: string
  changes: string[]
  observation?: string
}

export type UpdateIncidentInput = { version: number } & (
  | { action: 'update'; status: IncidentStatus; severity: Severity; observation: string }
  | { action: 'assume' }
  | { action: 'transfer'; analystId: string }
  | { action: 'reopen'; reason: string }
)

export interface Incident {
  id: string
  code?: string
  assigneeName?: string
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
  analystId?: string
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

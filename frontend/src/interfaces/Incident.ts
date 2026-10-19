export type Severity = 'Alta' | 'Média' | 'Baixa'
export type IncidentStatus = 'Aberto' | 'Em andamento' | 'Resolvido'
export type TimeOrder = 'newest' | 'oldest'

export interface Incident {
  id: string
  title: string
  driver: string
  plate: string
  location: string
  time: string
  occurredAt: string
  severity: Severity
  status: IncidentStatus
  category: string
  description: string
  route: string
}

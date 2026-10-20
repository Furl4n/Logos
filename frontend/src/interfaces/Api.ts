export interface UserReference { id: string; name: string }
export interface AuthUser extends UserReference { email: string; role: 'DRIVER' | 'ANALYST' }
export interface LoginRequest { email: string; password: string }
export interface LoginResponse { expiresIn: number; user: AuthUser }
export type IncidentSeverity = 'HIGH' | 'MEDIUM' | 'LOW'
export type IncidentStatus = 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED' | 'INCONCLUSIVE'
export type IncidentCategory = 'VEHICLE_ACCIDENT' | 'INJURY_ACCIDENT' | 'UNUSUAL_WEATHER' | 'MECHANICAL_ISSUE' | 'ROAD_BLOCK'
export interface IncidentFilters {
  assignment?: 'ALL' | 'MINE' | 'UNASSIGNED'
  search?: string
  severity?: IncidentSeverity
  category?: IncidentCategory
  status?: IncidentStatus | 'ACTIVE' | 'ALL'
  timeOrder?: 'newest' | 'oldest'
  page?: number
  pageSize?: number
}
export interface IncidentSummary {
  id: string; code: string; title: string; category: IncidentCategory
  severity: IncidentSeverity; status: IncidentStatus
  driver: UserReference; assignee: UserReference | null
  truckPlate: string; location: string; occurredAt: string; reportedAt: string; version: number
}
export type HistoryChange =
  | { type: 'CREATED' }
  | { type: 'STATUS' | 'SEVERITY' | 'REOPEN'; previousValue: string; newValue: string }
  | { type: 'ASSIGNEE'; previousAssignee: UserReference | null; newAssignee: UserReference }
export interface IncidentDetail extends IncidentSummary {
  description: string; routeCode: string | null; createdAt: string; updatedAt: string
  history: { id: string; version: number; author: UserReference; createdAt: string; changes: HistoryChange[]; observation: string | null }[]
}
export interface IncidentPage { items: IncidentSummary[]; page: number; pageSize: number; total: number }
export interface CreateIncidentRequest {
  title: string; description: string; category: IncidentCategory; severity: IncidentSeverity
  truckPlate: string; location: string; occurredAt: string; routeCode?: string | null; driverId?: string
}
export interface UpdateIncidentRequest { version: number; status: IncidentStatus; severity: IncidentSeverity; observation?: string | null }
export interface AssignIncidentRequest { version: number; analystId: string }
export interface ReopenIncidentRequest { version: number; reason: string }
export interface ApiErrorResponse {
  detail: string; code: string
  errors?: { field: string; message: string }[]
  currentIncident?: IncidentDetail
}

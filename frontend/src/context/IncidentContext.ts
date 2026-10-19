import { createContext } from 'react'
import type { CreateIncidentInput, Incident, UpdateIncidentInput } from '../interfaces/Incident'

export type IncidentUpdateResult = { ok: true; incident: Incident } | { ok: false; reason: 'conflict' | 'invalid'; incident: Incident }

export interface IncidentStore {
  incidents: Incident[]
  createIncident: (input: CreateIncidentInput) => Incident
  updateIncident: (id: string, input: UpdateIncidentInput) => IncidentUpdateResult
}

export const IncidentContext = createContext<IncidentStore | null>(null)

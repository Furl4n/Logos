import { createContext } from 'react'
import type { CreateIncidentInput, Incident } from '../interfaces/Incident'

export interface IncidentStore {
  incidents: Incident[]
  createIncident: (input: CreateIncidentInput) => Incident
}

export const IncidentContext = createContext<IncidentStore | null>(null)

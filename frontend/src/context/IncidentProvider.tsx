import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CreateIncidentInput, Incident } from '../interfaces/Incident'
import { incidents as initialIncidents } from '../service/mockIncidents'
import { drivers } from '../service/mockDrivers'
import { IncidentContext } from './IncidentContext'

export default function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState(initialIncidents)
  const nextCode = useRef(Math.max(...initialIncidents.map(incident => Number(incident.id.slice(4)))) + 1)

  function createIncident(input: CreateIncidentInput): Incident {
    const driver = drivers.find(driver => driver.id === input.driverId)
    if (!driver) throw new Error('Selecione um motorista cadastrado.')
    const minutesAgo = Math.max(0, Math.floor((Date.now() - Date.parse(input.occurredAt)) / 60_000))
    const time = minutesAgo < 1 ? 'agora' : minutesAgo < 60 ? `há ${minutesAgo} min` : `há ${Math.floor(minutesAgo / 60)} h`
    const incident: Incident = {
      ...input,
      id: `INC-${nextCode.current++}`,
      driver: driver.name,
      status: 'Aberto',
      time,
    }
    setIncidents(current => [incident, ...current])
    return incident
  }

  return <IncidentContext.Provider value={{ incidents, createIncident }}>{children}</IncidentContext.Provider>
}

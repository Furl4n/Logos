import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CreateIncidentInput, Incident, UpdateIncidentInput } from '../interfaces/Incident'
import type { IncidentUpdateResult } from './IncidentContext'
import { incidents as initialIncidents } from '../service/mockIncidents'
import { drivers } from '../service/mockDrivers'
import { IncidentContext } from './IncidentContext'

export default function IncidentProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState(initialIncidents)
  const currentIncidents = useRef(initialIncidents)
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
      version: 1,
      history: [{ id: crypto.randomUUID(), user: 'Analista atual', timestamp: new Date().toISOString(), changes: ['Ocorrência registrada.'] }],
    }
    currentIncidents.current = [incident, ...currentIncidents.current]
    setIncidents(currentIncidents.current)
    return incident
  }

  function updateIncident(id: string, input: UpdateIncidentInput): IncidentUpdateResult {
    const incident = currentIncidents.current.find(item => item.id === id)
    if (!incident) throw new Error('Ocorrência não encontrada.')
    if ((incident.version ?? 1) !== input.version) return { ok: false, reason: 'conflict', incident }
    const reopening = input.reopenReason !== undefined
    if (reopening ? incident.status !== 'Resolvido' || !input.reopenReason?.trim() : incident.status === 'Resolvido') return { ok: false, reason: 'invalid', incident }
    if (reopening) input = { ...input, status: 'Aberto', severity: incident.severity, resolution: '', assume: false }
    if ((input.assume && incident.analyst) || (input.status === 'Resolvido' && !input.resolution.trim())) return { ok: false, reason: 'invalid', incident }
    const changes: string[] = []
    if (reopening) {
      changes.push(`Ocorrência reaberta. Justificativa: ${input.reopenReason!.trim()}`)
      if (incident.resolution) changes.push(`Observações do atendimento anterior: ${incident.resolution}`)
    }
    if (input.assume) changes.push('Atendimento assumido por Analista atual.')
    if (input.status !== incident.status) changes.push(`Status: ${incident.status} → ${input.status}.`)
    if (input.severity !== incident.severity) changes.push(`Criticidade: ${incident.severity} → ${input.severity}.`)
    if (!reopening && input.resolution.trim() !== (incident.resolution ?? '')) changes.push(`Observações do atendimento: ${input.resolution.trim() || 'removidas'}`)
    if (!changes.length) return { ok: true, incident }
    const updated: Incident = {
      ...incident, status: input.status, severity: input.severity,
      resolution: input.resolution.trim(),
      analyst: input.assume ? 'Analista atual' : incident.analyst,
      version: (incident.version ?? 1) + 1,
      history: [{ id: crypto.randomUUID(), user: 'Analista atual', timestamp: new Date().toISOString(), changes }, ...(incident.history ?? [])],
    }
    currentIncidents.current = currentIncidents.current.map(item => item.id === id ? updated : item)
    setIncidents(currentIncidents.current)
    return { ok: true, incident: updated }
  }

  return <IncidentContext.Provider value={{ incidents, createIncident, updateIncident }}>{children}</IncidentContext.Provider>
}

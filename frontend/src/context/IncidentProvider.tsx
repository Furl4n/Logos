import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CreateIncidentInput, Incident, UpdateIncidentInput } from '../interfaces/Incident'
import type { IncidentUpdateResult } from './IncidentContext'
import { incidents as initialIncidents } from '../service/mockIncidents'
import { currentDriver, drivers } from '../service/mockDrivers'
import { useProfile } from '../hooks/useProfile'
import { IncidentContext } from './IncidentContext'
import { isIncidentClosed } from '../interfaces/Incident'
import { analysts, currentAnalyst } from '../service/mockAnalysts'

export default function IncidentProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const [incidents, setIncidents] = useState(initialIncidents)
  const currentIncidents = useRef(initialIncidents)
  const nextCode = useRef(Math.max(...initialIncidents.map(incident => Number(incident.id.slice(4)))) + 1)

  function createIncident(input: CreateIncidentInput): Incident {
    if (profile === 'driver') input = { ...input, driverId: currentDriver.id }
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
      history: [{ id: crypto.randomUUID(), user: profile === 'driver' ? driver.name : currentAnalyst.name, timestamp: new Date().toISOString(), changes: ['Ocorrência registrada.'] }],
    }
    currentIncidents.current = [incident, ...currentIncidents.current]
    setIncidents(currentIncidents.current)
    return incident
  }

  function updateIncident(id: string, input: UpdateIncidentInput): IncidentUpdateResult {
    const incident = currentIncidents.current.find(item => item.id === id)
    if (!incident) throw new Error('Ocorrência não encontrada.')
    if (profile === 'driver') return { ok: false, reason: 'forbidden', incident }
    if ((incident.version ?? 1) !== input.version) return { ok: false, reason: 'conflict', incident }
    const changes: string[] = []
    const closed = isIncidentClosed(incident.status)
    let status = incident.status
    let severity = incident.severity
    let analystId = incident.analystId
    let observation: string | undefined

    if (input.action === 'reopen') {
      if (!closed || !input.reason.trim()) return { ok: false, reason: 'invalid', incident }
      status = 'Aberto'
      analystId = currentAnalyst.id
      changes.push(`Ocorrência reaberta. Justificativa: ${input.reason.trim()}`, `Responsável: ${currentAnalyst.name}.`)
    } else {
      if (closed) return { ok: false, reason: 'invalid', incident }
      if (input.action === 'assume') {
        if (incident.analystId) return { ok: false, reason: 'forbidden', incident }
        analystId = currentAnalyst.id
        status = 'Em investigação'
        changes.push(`Atendimento assumido por ${currentAnalyst.name}.`)
      } else {
        if (incident.analystId !== currentAnalyst.id) return { ok: false, reason: 'forbidden', incident }
        if (input.action === 'transfer') {
          const target = analysts.find(analyst => analyst.id === input.analystId)
          if (!target || target.id === incident.analystId) return { ok: false, reason: 'invalid', incident }
          analystId = target.id
          changes.push(`Responsável: ${currentAnalyst.name} → ${target.name}.`)
        } else {
          if (isIncidentClosed(input.status) && !input.observation.trim()) return { ok: false, reason: 'invalid', incident }
          status = input.status
          severity = input.severity
          observation = input.observation.trim() || undefined
        }
      }
    }
    if (status !== incident.status) changes.push(`Status: ${incident.status} → ${status}.`)
    if (severity !== incident.severity) changes.push(`Criticidade: ${incident.severity} → ${severity}.`)
    if (!changes.length && !observation) return { ok: true, incident }
    const updated: Incident = {
      ...incident, status, severity, analystId,
      version: (incident.version ?? 1) + 1,
      history: [{ id: crypto.randomUUID(), user: currentAnalyst.name, timestamp: new Date().toISOString(), changes, observation }, ...(incident.history ?? [])],
    }
    currentIncidents.current = currentIncidents.current.map(item => item.id === id ? updated : item)
    setIncidents(currentIncidents.current)
    return { ok: true, incident: updated }
  }

  return <IncidentContext.Provider value={{ incidents, createIncident, updateIncident }}>{children}</IncidentContext.Provider>
}

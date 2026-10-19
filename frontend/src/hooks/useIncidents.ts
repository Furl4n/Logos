import { useState } from 'react'
import { useIncidentStore } from './useIncidentStore'
import type { Severity, TimeOrder } from '../interfaces/Incident'
import { isIncidentClosed } from '../interfaces/Incident'

const severityPriority: Record<Severity, number> = { Alta: 0, Média: 1, Baixa: 2 }

export function useIncidents() {
  const { incidents, createIncident } = useIncidentStore()
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('Todas')
  const [category, setCategory] = useState('Todas')
  const [status, setStatus] = useState('Ativos')
  const [timeOrder, setTimeOrder] = useState<TimeOrder>('newest')
  const filtered = incidents.filter(incident =>
    (severity === 'Todas' || incident.severity === severity) &&
    (category === 'Todas' || incident.category === category) &&
    (status === 'Todos' || (status === 'Ativos' ? !isIncidentClosed(incident.status) : incident.status === status)) &&
    `${incident.title} ${incident.driver} ${incident.plate} ${incident.location} ${incident.id}`
      .toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
  ).sort((a, b) => {
    const priorityDifference = severityPriority[a.severity] - severityPriority[b.severity]
    if (priorityDifference !== 0) return priorityDifference
    const difference = Date.parse(a.occurredAt) - Date.parse(b.occurredAt)
    return timeOrder === 'oldest' ? difference : -difference
  })
  const hasFilters = Boolean(search || severity !== 'Todas' || category !== 'Todas' || status !== 'Ativos')
  function clearFilters() {
    setSearch('')
    setSeverity('Todas')
    setCategory('Todas')
    setStatus('Ativos')
  }
  return { incidents, filtered, search, setSearch, severity, setSeverity, category, setCategory, status, setStatus, timeOrder, setTimeOrder, hasFilters, clearFilters, createIncident }
}

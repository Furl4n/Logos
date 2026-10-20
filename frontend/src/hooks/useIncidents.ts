import { useEffect, useState } from 'react'
import type { TimeOrder } from '../interfaces/Incident'
import { useIncidentList } from './useIncidentApi'
import { categoryLabels, enumValue, severityLabels, statusLabels, toIncident } from '../service/incidentMapper'

export function useIncidents() {
  const [filters, setFilters] = useState({ search: '', severity: 'Todas', category: 'Todas', status: 'Ativos', timeOrder: 'newest' as TimeOrder, page: 1 })
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timeout = window.setTimeout(() => setFilters(current => ({ ...current, search: search.trim(), page: 1 })), 300)
    return () => window.clearTimeout(timeout)
  }, [search])
  function change<K extends keyof typeof filters>(key: K, value: typeof filters[K]) {
    setFilters(current => ({ ...current, [key]: value, page: 1 }))
  }
  const query = useIncidentList({
    search: filters.search || undefined,
    severity: enumValue(severityLabels, filters.severity),
    category: enumValue(categoryLabels, filters.category),
    status: filters.status === 'Ativos' ? 'ACTIVE' : filters.status === 'Todos' ? 'ALL' : enumValue(statusLabels, filters.status),
    timeOrder: filters.timeOrder, page: filters.page, pageSize: 100,
  })
  function clearFilters() {
    setSearch('')
    setFilters(current => ({ ...current, search: '', severity: 'Todas', category: 'Todas', status: 'Ativos', page: 1 }))
  }
  return {
    ...query, filtered: (query.data?.items ?? []).map(toIncident), total: query.data?.total ?? 0,
    search, setSearch, severity: filters.severity, setSeverity: (value: string) => change('severity', value),
    category: filters.category, setCategory: (value: string) => change('category', value),
    status: filters.status, setStatus: (value: string) => change('status', value),
    timeOrder: filters.timeOrder, setTimeOrder: (value: TimeOrder) => change('timeOrder', value),
    page: filters.page, setPage: (page: number) => setFilters(current => ({ ...current, page })),
    hasFilters: Boolean(search || filters.severity !== 'Todas' || filters.category !== 'Todas' || filters.status !== 'Ativos'),
    clearFilters, searching: search.trim() !== filters.search,
  }
}

import { useContext } from 'react'
import { IncidentContext } from '../context/IncidentContext'

export function useIncidentStore() {
  const store = useContext(IncidentContext)
  if (!store) throw new Error('useIncidentStore deve ser usado dentro de IncidentProvider.')
  return store
}

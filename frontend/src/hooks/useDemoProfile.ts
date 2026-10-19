import { useContext } from 'react'
import { DemoProfileContext } from '../context/DemoProfileContext'

export function useDemoProfile() {
  const context = useContext(DemoProfileContext)
  if (!context) throw new Error('O perfil de demonstração precisa do DemoProfileProvider.')
  return context
}

import { createContext } from 'react'

export type DemoProfile = 'analyst' | 'driver'

export const DemoProfileContext = createContext<{
  profile: DemoProfile
  setProfile: (profile: DemoProfile) => void
} | null>(null)

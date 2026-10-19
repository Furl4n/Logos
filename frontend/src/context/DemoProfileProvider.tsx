import { useState, type ReactNode } from 'react'
import { DemoProfileContext, type DemoProfile } from './DemoProfileContext'

export default function DemoProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<DemoProfile>('analyst')
  return <DemoProfileContext.Provider value={{ profile, setProfile }}>{children}</DemoProfileContext.Provider>
}

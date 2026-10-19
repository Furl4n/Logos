import { Outlet } from 'react-router-dom'
import { useIncidentStore } from '../../hooks/useIncidentStore'
import SideNav from './SideNav'

export default function AppLayout() {
  const { incidents } = useIncidentStore()
  return <div className="min-h-screen"><SideNav count={incidents.length} /><div className="sm:ml-19 xl:ml-60"><main className="mx-auto max-w-345 pr-5 pl-4 pt-4 lg:pr-10 lg:pl-6 lg:pt-5"><Outlet /><footer className="flex flex-wrap items-center justify-between gap-3 py-7 text-xs text-muted"><span className="text-lg font-semibold tracking-tight">logos.</span><span>Conectando pessoas. Movendo soluções.</span></footer></main></div></div>
}

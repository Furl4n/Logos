import { Outlet } from 'react-router-dom'
import SideNav from './SideNav'

export default function AppLayout() {
  return (
    <div className="min-h-dvh">
      <SideNav />
      <div className="sm:ml-19 xl:ml-60">
        <div className="mx-auto flex min-h-dvh max-w-345 flex-col pr-5 pl-4 pt-4 lg:pr-10 lg:pl-6 lg:pt-5">
          <main className="flex-1"><Outlet /></main>
          <footer className="flex flex-wrap items-center justify-between gap-3 py-7 text-xs text-muted">
            <span className="text-lg font-semibold tracking-tight">logos.</span>
            <span>Conectando pessoas. Movendo soluções.</span>
          </footer>
        </div>
      </div>
    </div>
  )
}

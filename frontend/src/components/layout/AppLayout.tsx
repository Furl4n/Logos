import { Outlet, useMatch } from 'react-router-dom'
import SideNav from './SideNav'

export default function AppLayout() {
  const board = useMatch('/quadro')
  return (
    <div className={`flex flex-col ${board ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <SideNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:ml-19 xl:ml-60">
        <div className="mx-auto flex min-h-0 w-full max-w-345 flex-1 flex-col pr-5 pl-4 pt-4 lg:pr-10 lg:pl-6 lg:pt-5">
          <main className={board ? 'flex min-h-0 flex-1 flex-col' : 'flex-1'}><Outlet /></main>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-6 pb-3 text-xs text-muted">
            <span className="text-lg font-semibold tracking-tight">logos.</span>
            <span>Conectando pessoas. Movendo soluções.</span>
          </footer>
        </div>
      </div>
    </div>
  )
}

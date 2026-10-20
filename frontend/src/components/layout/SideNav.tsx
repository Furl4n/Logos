import Icon from '../ui/Icons'
import { Link, NavLink } from 'react-router-dom'
import UserMenu from './UserMenu'

export default function SideNav() {
  const home = '/incidentes'
  return (
    <>
    <header className="relative z-10 flex items-center justify-between border-b border-line bg-white px-4 py-2 sm:hidden">
      <Link to={home} aria-label="Logos — início" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-lg bg-brand text-2xl font-semibold text-white">↗</span>
        <span className="text-3xl font-semibold tracking-tighter">logos<span className="text-brand">.</span></span>
      </Link>
      <UserMenu mobile />
    </header>
    <aside className="fixed inset-y-0 left-0 hidden w-19 flex-col border-r border-line bg-white px-2.5 pt-4 sm:flex xl:w-60 xl:px-4">
      <Link to={home} aria-label="Logos — início" className="mx-auto mb-5 flex items-center gap-2.5 xl:mx-3">
        <span className="grid size-9 place-items-center rounded-lg bg-brand text-3xl font-semibold text-white">↗</span>
        <span className="hidden text-4xl font-semibold tracking-tighter xl:block">logos<span className="text-brand">.</span></span>
      </Link>
      <div className="mb-7 hidden items-center gap-2.5 border-b border-line pb-6 text-sm font-medium xl:flex">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-muted"><Icon name="truck" /></span>
        <div>Central de operações<small className="mt-1 block text-xs font-normal text-muted">Gestão de transporte</small></div>
      </div>
      <span className="mb-3 hidden px-3 text-xs font-semibold tracking-widest text-muted xl:block">OPERAÇÃO</span>
      <nav aria-label="Navegação principal">
        <NavLink to={home} aria-label="Incidentes" className={({ isActive }) => `flex items-center justify-center gap-3 rounded-md px-3 py-3 text-sm font-medium xl:justify-start ${isActive ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-canvas'}`}>
          <Icon name="grid" /><span className="hidden xl:block">Incidentes</span>
        </NavLink>
      </nav>
      <UserMenu />
    </aside>
    </>
  )
}

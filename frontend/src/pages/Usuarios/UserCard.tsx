import type { ManagedUser } from '../../interfaces/Api'

const roleLabels = { ADMIN: 'Administrador', DRIVER: 'Motorista', ANALYST: 'Analista' }

export default function UserCard({ user, onChangeStatus }: { user: ManagedUser; onChangeStatus: (user: ManagedUser) => void }) {
  return <article className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 rounded-lg border border-line px-3 py-3 sm:px-4 sm:py-3.5 md:gap-x-5 ${user.role === 'ADMIN' ? '' : 'md:grid-cols-[minmax(0,1fr)_auto_auto]'}`}>
    <div className="col-span-2 min-w-0 md:col-span-1"><h2 className="truncate text-base font-medium" title={user.name}>{user.name}</h2><p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">{user.email}</p></div>
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm ${user.role === 'ADMIN' ? 'col-span-2 md:col-span-1' : ''}`}><span className="whitespace-nowrap">{roleLabels[user.role]}</span><span className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-success-soft text-success' : 'bg-neutral-soft text-muted'}`}>{user.isActive ? 'Ativo' : 'Inativo'}</span></div>
    {user.role !== 'ADMIN' && <button type="button" onClick={() => onChangeStatus(user)} className={`min-h-10 justify-self-end whitespace-nowrap rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-canvas ${user.isActive ? 'text-danger' : 'text-brand-dark'}`}>{user.isActive ? 'Desativar' : 'Reativar'}</button>}
  </article>
}

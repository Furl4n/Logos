import type { ManagedUser } from '../../interfaces/Api'

const roleLabels = { ADMIN: 'Administrador', DRIVER: 'Motorista', ANALYST: 'Analista' }

export default function UserCard({ user, onChangeStatus }: { user: ManagedUser; onChangeStatus: (user: ManagedUser) => void }) {
  return <article className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border border-line px-4 py-3.5">
    <div className="min-w-0 flex-1 basis-48"><h2 className="truncate text-base font-medium" title={user.name}>{user.name}</h2><p className="mt-1 break-all text-sm text-muted">{user.email}</p></div>
    <div className="flex items-center gap-3 text-sm"><span>{roleLabels[user.role]}</span><span className={`rounded px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-success-soft text-success' : 'bg-neutral-soft text-muted'}`}>{user.isActive ? 'Ativo' : 'Inativo'}</span></div>
    {user.role !== 'ADMIN' && <button type="button" onClick={() => onChangeStatus(user)} className={`rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-canvas ${user.isActive ? 'text-danger' : 'text-brand-dark'}`}>{user.isActive ? 'Desativar' : 'Reativar'}</button>}
  </article>
}

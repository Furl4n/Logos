import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icons'
import Modal from '../../components/ui/Modal'
import FormSelect from '../../components/ui/FormSelect'
import { useManagedUsers, useUserStatus } from '../../hooks/useUserAdministration'
import type { ManagedUser, UserStatusFilter } from '../../interfaces/Api'
import { ApiError } from '../../service/api'
import UserCard from './UserCard'
import UserFormModal from './UserFormModal'

export default function Usuarios() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [accountStatus, setAccountStatus] = useState<UserStatusFilter>('ACTIVE')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<ManagedUser | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const users = useManagedUsers(query, page, accountStatus)
  const status = useUserStatus()
  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  async function changeStatus() {
    if (!selected || status.isPending) return
    setError('')
    try {
      await status.mutateAsync({ id: selected.id, isActive: !selected.isActive })
      if (users.data?.items.length === 1 && page > 1 && accountStatus !== 'ALL') setPage(page - 1)
      setMessage(`${selected.name}: conta ${selected.isActive ? 'desativada' : 'reativada'}.`)
      setSelected(null)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Não foi possível atualizar a conta. Tente novamente.')
    }
  }

  return <>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-medium tracking-tight">Usuários</h1>
      <Button onClick={() => { setMessage(''); setCreating(true) }}><Icon name="plus" size={17} />Criar usuário</Button>
    </header>
    {message && <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-success-line px-3 py-2 text-sm text-success"><span>{message}</span><button type="button" aria-label="Fechar confirmação" onClick={() => setMessage('')} className="ml-auto p-1"><Icon name="close" size={16} /></button></div>}
    <div className="mb-4 flex items-center gap-3">
      <div className="relative min-w-0 flex-1"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted"><Icon name="search" size={18} /></span><input aria-label="Buscar usuários por nome ou e-mail" placeholder="Buscar por nome ou e-mail…" value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full rounded-md border border-line bg-canvas pr-3 pl-10 text-sm text-ink placeholder:text-muted" /></div>
      <FormSelect label="Contas" ariaLabel="Filtrar contas por situação" value={accountStatus} onChange={value => { setAccountStatus(value as UserStatusFilter); setPage(1) }} options={[{ value: 'ACTIVE', label: 'Ativas' }, { value: 'INACTIVE', label: 'Desativadas' }, { value: 'ALL', label: 'Todas' }]} />
    </div>
    <section aria-label="Lista de usuários" aria-busy={users.isFetching} className="space-y-2">
      {users.isPending ? <p role="status" className="py-10 text-center text-sm text-muted">Carregando usuários…</p>
        : users.isError ? <div role="alert" className="rounded-lg border border-danger-line p-4 text-sm text-danger"><p>Não foi possível carregar os usuários.</p><button type="button" onClick={() => void users.refetch()} className="mt-2 underline">Tentar novamente</button></div>
        : users.data.items.length === 0 ? <p role="status" className="py-10 text-center text-sm text-muted">Nenhum usuário encontrado.</p>
        : users.data.items.map(user => <UserCard key={user.id} user={user} onChangeStatus={value => { setError(''); setSelected(value) }} />)}
    </section>
    {users.data && users.data.total > 20 && <nav aria-label="Paginação de usuários" className="mt-5 flex items-center justify-end gap-3 text-sm"><button type="button" disabled={page <= 1 || users.isFetching} onClick={() => setPage(page - 1)} className="rounded-md border border-line px-3 py-2 disabled:opacity-40">Anterior</button><span>Página {page} de {Math.ceil(users.data.total / 20)}</span><button type="button" disabled={page * 20 >= users.data.total || users.isFetching} onClick={() => setPage(page + 1)} className="rounded-md border border-line px-3 py-2 disabled:opacity-40">Próxima</button></nav>}
    {creating && <UserFormModal onClose={() => setCreating(false)} onCreated={name => { setCreating(false); setSearch(''); setQuery(''); setAccountStatus('ACTIVE'); setPage(1); setMessage(`${name}: usuário criado.`) }} />}
    {selected && <Modal title={selected.isActive ? 'Desativar conta?' : 'Reativar conta?'} onClose={() => { if (!status.isPending) setSelected(null) }}>
      <p className="break-words text-sm text-muted">{selected.isActive ? `${selected.name} perderá o acesso ao sistema. Os incidentes e o histórico serão preservados.` : `${selected.name} poderá acessar o sistema novamente.`}</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={status.isPending} onClick={() => setSelected(null)} className="rounded-md px-3 py-2 text-sm text-muted">Cancelar</button><Button disabled={status.isPending} onClick={() => void changeStatus()}>{status.isPending ? 'Salvando…' : selected.isActive ? 'Desativar' : 'Reativar'}</Button></div>
    </Modal>}
  </>
}

import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser, useLogout } from '../../hooks/useAuth'
import ThemeSwitcher from '../ui/ThemeSwitcher'

export default function UserMenu({ mobile = false }: { mobile?: boolean }) {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const logoutButton = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')

  useEffect(() => {
    if (!open) return
    logoutButton.current?.focus()
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  async function handleLogout() {
    if (leaving) return
    setLeaving(true)
    setError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    }
    catch { setError('Não foi possível sair. Tente novamente.') }
    finally { setLeaving(false) }
  }

  return (
    <div ref={container} className={mobile ? 'relative' : 'relative mt-auto border-t border-line pt-2 pb-1'}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          setOpen(false)
          trigger.current?.focus()
        }
      }}>
      {open && (
        <div id={panelId} className={`absolute z-20 w-56 rounded-lg border border-strong bg-surface p-1.5 shadow-lg ${mobile ? 'top-full right-0 mt-1' : 'bottom-full left-0 mb-1 xl:w-full'}`}>
          {mobile && <div className="border-b border-line px-3 py-2 text-sm"><p className="break-words font-medium">{user?.name}</p><p className="mt-1 text-xs text-muted">{user?.role === 'DRIVER' ? 'Motorista' : 'Analista de operações'}</p></div>}
          {error && <p role="alert" className="px-3 py-2 text-sm text-danger">{error}</p>}
          <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-line px-3 py-2"><span className="text-sm font-medium">Tema</span><ThemeSwitcher /></div>
          <button ref={logoutButton} type="button" aria-disabled={leaving} onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-canvas focus-visible:bg-canvas aria-disabled:opacity-50">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H4v14h5 M10 12h11 m-4-4 4 4-4 4" /></svg>
            {leaving ? 'Saindo…' : 'Sair da conta'}
          </button>
        </div>
      )}
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={open ? panelId : undefined}
        aria-label={`Opções da conta de ${user?.name ?? 'usuário'}`} onClick={() => setOpen(value => !value)}
        className={`flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-left text-sm font-medium hover:bg-canvas xl:justify-start xl:px-1 ${open ? 'bg-canvas' : ''}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border-3 border-avatar-line bg-avatar text-xs text-avatar-ink">{initials}</span>
        <span className="hidden min-w-0 flex-1 xl:block">
          <span className="block truncate">{user?.name}</span>
          <span className="mt-1 block truncate text-xs font-normal text-muted">{user?.role === 'DRIVER' ? 'Motorista' : 'Analista de operações'}</span>
        </span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={`hidden shrink-0 text-muted xl:block ${open ? 'rotate-180' : ''}`}><path d="m7 14 5-5 5 5" /></svg>
      </button>
    </div>
  )
}

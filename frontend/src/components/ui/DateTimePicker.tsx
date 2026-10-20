import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface DateTimePickerProps {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
}

const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export default function DateTimePicker({ id, value, onChange, invalid, describedBy }: DateTimePickerProps) {
  const selected = new Date(value)
  const valid = Number.isFinite(selected.getTime())
  const [open, setOpen] = useState(false)
  const [today, setToday] = useState(() => new Date())
  const [portalTarget, setPortalTarget] = useState<Element | null>(null)
  const [month, setMonth] = useState(() => new Date(valid ? selected.getFullYear() : new Date().getFullYear(), valid ? selected.getMonth() : new Date().getMonth(), 1))
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const calendar = useRef<HTMLDivElement>(null)
  const [placement, setPlacement] = useState({ top: 0, left: 0 })
  const firstDay = month.getDay()
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const time = value.slice(11, 16) || '00:00'

  useLayoutEffect(() => {
    if (!open) return
    let frame = 0
    function placeCalendar() {
      if (!trigger.current || !calendar.current) return
      const rect = trigger.current.getBoundingClientRect()
      const below = Math.max(0, window.innerHeight - 8 - rect.bottom - 4)
      const above = Math.max(0, rect.top - 8 - 4)
      const height = calendar.current.offsetHeight
      const openAbove = below < height && above > below
      const top = openAbove ? rect.top - height - 4 : rect.bottom + 4
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - calendar.current.offsetWidth - 8))
      setPlacement(current => current.top === top && current.left === left
        ? current
        : { top, left })
    }
    function schedulePlacement() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(placeCalendar)
    }
    placeCalendar()
    const observer = new ResizeObserver(schedulePlacement)
    if (calendar.current) observer.observe(calendar.current)
    window.addEventListener('resize', schedulePlacement)
    window.addEventListener('scroll', schedulePlacement, true)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedulePlacement)
      window.removeEventListener('scroll', schedulePlacement, true)
    }
  }, [open, month])

  useEffect(() => {
    if (!open) return
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node) && !calendar.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={root} className="relative" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !calendar.current?.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
      if (open && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        trigger.current?.focus()
      }
    }}>
      <button ref={trigger} id={id} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-calendar` : undefined} aria-invalid={invalid || undefined} aria-describedby={describedBy} onClick={() => {
        if (!open) {
          const now = new Date()
          setToday(now)
          setPortalTarget(trigger.current?.closest('[role="dialog"]') ?? document.body)
          const initialDate = valid ? selected : now
          setMonth(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
        }
        setOpen(!open)
      }} className={`flex h-10 w-full items-center justify-between rounded-md border bg-surface px-3 text-sm text-ink ${invalid ? 'border-danger' : open ? 'border-brand/50' : 'border-line hover:border-strong'}`}>
        <span>{valid ? `${selected.toLocaleDateString('pt-BR')} às ${time}` : 'Selecione a data e hora'}</span>
        <svg className="text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
      </button>
      {open && portalTarget && createPortal(<div ref={calendar} id={`${id}-calendar`} role="dialog" aria-label="Selecionar data e hora" style={placement} onWheel={event => {
        for (let parent = root.current?.parentElement; parent; parent = parent.parentElement) {
          if (/(auto|scroll)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) {
            parent.scrollBy({ top: event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? parent.clientHeight : 1) })
            break
          }
        }
      }} className="fixed z-40 w-72 max-w-[calc(100vw-3rem)] rounded-lg border border-line bg-surface p-3 shadow-lg shadow-slate-900/10">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-brand-soft hover:text-brand-dark">‹</button>
          <span aria-live="polite" className="text-sm font-semibold capitalize text-ink">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          <button type="button" aria-label="Próximo mês" disabled={month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-brand-soft hover:text-brand-dark disabled:opacity-30">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span key={index} aria-hidden="true" className="py-1 text-center text-xs font-medium text-muted">{day}</span>)}
          {Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const day = new Date(month.getFullYear(), month.getMonth(), index + 1)
            const key = dateKey(day)
            const active = key === value.slice(0, 10)
            return <button key={key} type="button" aria-label={day.toLocaleDateString('pt-BR', { dateStyle: 'full' })} aria-pressed={active} aria-current={key === dateKey(today) ? 'date' : undefined} disabled={key > dateKey(today)} onClick={() => {
              const nextTime = key === dateKey(today) && time > `${pad(today.getHours())}:${pad(today.getMinutes())}` ? `${pad(today.getHours())}:${pad(today.getMinutes())}` : time
              onChange(`${key}T${nextTime}`)
            }} className={`h-8 rounded-md text-sm disabled:cursor-not-allowed disabled:text-disabled ${active ? 'bg-brand font-semibold text-white' : 'text-ink hover:bg-brand-soft hover:text-brand-dark aria-[current=date]:font-semibold aria-[current=date]:text-brand-dark'}`}>{index + 1}</button>
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <label htmlFor={`${id}-time`} className="text-sm font-medium text-ink">Horário</label>
          <input id={`${id}-time`} type="time" value={time} onChange={event => {
            if (event.target.value) onChange(`${value.slice(0, 10) || dateKey(today)}T${event.target.value}`)
          }} className="h-9 rounded-md border border-line px-2 text-sm text-ink" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" className="rounded-md px-2 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-soft" onClick={() => {
            const now = new Date()
            setToday(now)
            onChange(`${dateKey(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}`)
            setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
          }}>Agora</button>
          <button type="button" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover" onClick={() => { setOpen(false); trigger.current?.focus() }}>Concluir</button>
        </div>
      </div>, portalTarget)}
    </div>
  )
}

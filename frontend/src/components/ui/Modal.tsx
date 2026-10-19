import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icons'

interface Props {
  title: string
  caption: string
  onClose: () => void
  children: ReactNode
  sidePanel?: boolean
}

export default function Modal({ title, caption, onClose, children, sidePanel = false }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]')
      if (!elements?.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [])
  return <div className={`fixed inset-0 z-20 flex bg-slate-900/30 ${sidePanel ? 'justify-end' : 'items-center justify-center p-5'}`} onClick={onClose}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={event => event.stopPropagation()} className={sidePanel ? 'h-full w-full max-w-118 overflow-y-auto bg-white p-6 shadow-xl sm:p-8' : 'w-full max-w-105 rounded-xl bg-white p-8 shadow-xl'}>
      <div className="mb-8 flex items-center justify-between gap-4 text-xs text-muted"><span>{caption}</span><button type="button" aria-label="Fechar painel" onClick={onClose} className="grid size-8 place-items-center rounded-md bg-canvas hover:bg-slate-200"><Icon name="close" /></button></div>
      <h2 id="dialog-title" className="mb-5 text-2xl leading-snug font-medium tracking-tight">{title}</h2>
      {children}
    </section>
  </div>
}

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icons'

interface Props {
  title: string
  caption?: string
  onClose: () => void
  children: ReactNode
  sidePanel?: boolean
  wide?: boolean
}

export default function Modal({ title, caption, onClose, children, sidePanel = false, wide = false }: Props) {
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
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')
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
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={event => event.stopPropagation()} className={sidePanel ? 'h-full w-full max-w-118 overflow-hidden bg-white shadow-xl' : `w-full overflow-hidden rounded-xl bg-white shadow-xl ${wide ? 'max-w-180' : 'max-w-105'}`}>
      <div className={sidePanel ? 'h-full overflow-y-auto px-6 pt-3 pb-6 sm:px-8 sm:pb-8' : 'max-h-[calc(100dvh-2.5rem)] overflow-y-auto px-4 pt-4 pb-3'}>
      <div className={`${caption ? 'mb-2' : 'mb-5'} flex items-center justify-between gap-4`}>
        {caption ? <span className="text-xs text-muted">{caption}</span> : <h2 id="dialog-title" className="text-2xl leading-snug font-medium tracking-tight">{title}</h2>}
        <button type="button" aria-label="Fechar painel" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-brand-soft hover:text-brand-dark"><Icon name="close" /></button>
      </div>
      {caption && <h2 id="dialog-title" className="mb-3 text-2xl leading-snug font-medium tracking-tight">{title}</h2>}
      {children}
      </div>
    </section>
  </div>
}

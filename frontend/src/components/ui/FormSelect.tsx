import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { KeyboardEvent } from 'react'
import Icon from './Icons'

interface FormSelectProps {
  label: string
  ariaLabel: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  active?: boolean
  id?: string
  variant?: 'filter' | 'field'
  placeholder?: string
  required?: boolean
  invalid?: boolean
  describedBy?: string
  wrapLabel?: boolean
}

export default function FormSelect({ label, ariaLabel, value, options, onChange, active = false, id: providedId, variant = 'filter', placeholder = 'Selecione', required = false, invalid = false, describedBy, wrapLabel = false }: FormSelectProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 0, maxHeight: 256 })
  const selectedIndex = options.findIndex(option => option.value === value)
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !listRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    function placeOptions() {
      const trigger = triggerRef.current
      const list = listRef.current
      if (!trigger || !list) return
      const rect = trigger.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const openAbove = below < Math.min(list.scrollHeight, 200) && above > below
      const maxHeight = Math.min(256, Math.max(0, (openAbove ? above : below) - 4))
      const width = Math.max(rect.width, list.getBoundingClientRect().width)
      setPosition({
        top: openAbove ? rect.top - Math.min(list.scrollHeight, maxHeight) - 4 : rect.bottom + 4,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        minWidth: rect.width,
        maxHeight,
      })
    }
    placeOptions()
    window.addEventListener('resize', placeOptions)
    window.addEventListener('scroll', placeOptions, true)
    return () => {
      window.removeEventListener('resize', placeOptions)
      window.removeEventListener('scroll', placeOptions, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const list = listRef.current
    const option = list?.children[highlighted] as HTMLElement | undefined
    if (!list || !option) return
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight
    }
  }, [highlighted, open])

  function showOptions(index = Math.max(selectedIndex, 0)) {
    setHighlighted(index)
    searchRef.current = { text: '', time: 0 }
    setOpen(true)
  }

  function choose(index: number) {
    if (!options[index]) return
    onChange(options[index].value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'Tab') { setOpen(false); triggerRef.current?.focus(); return }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      if (event.key === 'ArrowDown') setHighlighted(index => (index + 1) % options.length)
      if (event.key === 'ArrowUp') setHighlighted(index => (index - 1 + options.length) % options.length)
      if (event.key === 'Home') setHighlighted(0)
      if (event.key === 'End') setHighlighted(options.length - 1)
      if (event.key === 'Enter' || event.key === ' ') choose(highlighted)
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      const text = (Date.now() - searchRef.current.time < 700 ? searchRef.current.text : '') + event.key.toLocaleLowerCase('pt-BR')
      searchRef.current = { text, time: Date.now() }
      const index = options.findIndex(option => option.label.toLocaleLowerCase('pt-BR').startsWith(text))
      if (index >= 0) setHighlighted(index)
    }
  }

  return (
    <div ref={rootRef} className={`relative min-w-0 max-w-full ${variant === 'field' ? 'w-full' : 'sm:shrink-0'}`} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !listRef.current?.contains(event.relatedTarget)) setOpen(false)
    }}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={`${ariaLabel}: ${selected?.label ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => open ? setOpen(false) : showOptions()}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            showOptions(event.key === 'ArrowUp' ? options.length - 1 : Math.max(selectedIndex, 0))
          }
        }}
        className={`inline-flex ${wrapLabel ? 'min-h-10 py-2' : 'h-10'} max-w-full items-center gap-1.5 rounded-md border bg-surface text-sm ${variant === 'field' ? 'w-full justify-between px-3' : 'w-full justify-between px-2 sm:w-auto'} ${invalid ? 'border-danger' : open || active ? 'border-brand/50' : 'border-line hover:border-strong'}`}
      >
        <span className="inline-flex min-w-0 items-baseline gap-1.5">
          {variant === 'filter' && <span className="shrink-0 text-xs font-medium text-brand-dark">{label}</span>}
          <span className={`min-w-0 ${wrapLabel ? 'break-words text-left leading-snug' : 'truncate'} ${variant === 'filter' ? 'font-medium' : 'font-normal'} ${selected ? 'text-ink' : 'text-muted'}`}>{selected?.label ?? placeholder}</span>
        </span>
        <span className={`inline-flex shrink-0 text-muted ${open ? '-rotate-90' : 'rotate-90'}`}><Icon name="arrow" size={16} /></span>
      </button>

      {open && createPortal(
        <ul
          ref={listRef}
          id={`${id}-options`}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${id}-option-${highlighted}`}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onBlur={event => {
            if (!rootRef.current?.contains(event.relatedTarget) && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
          }}
          style={{ ...position, ...(wrapLabel ? { width: position.minWidth } : {}) }}
          className="fixed z-40 w-max max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-line bg-surface p-1.5 shadow-lg shadow-slate-900/10 outline-none"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              onPointerMove={() => setHighlighted(index)}
              onMouseDown={event => event.preventDefault()}
              onClick={() => choose(index)}
              className={`flex cursor-pointer items-center justify-between gap-5 rounded-md px-3 py-2.5 text-sm ${highlighted === index ? 'bg-brand-soft text-brand-dark' : 'text-ink'} ${option.value === value ? 'font-medium' : 'font-normal'}`}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              <span className="inline-flex size-4 shrink-0 items-center justify-center text-brand-dark">
                {option.value === value && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
              </span>
            </li>
          ))}
        </ul>, triggerRef.current?.closest('[role="dialog"]') ?? document.body,
      )}
    </div>
  )
}

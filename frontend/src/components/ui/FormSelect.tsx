import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Icon from './Icons'

interface FormSelectProps {
  label: string
  ariaLabel: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  active?: boolean
}

export default function FormSelect({ label, ariaLabel, value, options, onChange, active = false }: FormSelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const selectedIndex = options.findIndex(option => option.value === value)
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
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
    <div ref={rootRef} className="relative max-w-full" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${ariaLabel}: ${selected?.label ?? ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        onClick={() => open ? setOpen(false) : showOptions()}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            showOptions(event.key === 'ArrowUp' ? options.length - 1 : Math.max(selectedIndex, 0))
          }
        }}
        className={`inline-flex h-10 max-w-full items-center gap-1.5 rounded-md border bg-white px-2 text-sm ${open || active ? 'border-brand/50' : 'border-line hover:border-slate-400'}`}
      >
        <span className="inline-flex min-w-0 items-baseline gap-1.5">
          <span className="shrink-0 text-xs font-medium text-brand-dark">{label}</span>
          <span className="min-w-0 truncate font-medium text-ink">{selected?.label}</span>
        </span>
        <span className={`inline-flex text-muted ${open ? '-rotate-90' : 'rotate-90'}`}><Icon name="arrow" size={16} /></span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-options`}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${id}-option-${highlighted}`}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute top-full left-0 z-30 mt-1 max-h-64 w-max min-w-full max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-line bg-white p-1.5 shadow-lg shadow-slate-900/10 outline-none"
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
              <span>{option.label}</span>
              <span className="inline-flex size-4 shrink-0 items-center justify-center text-brand-dark">
                {option.value === value && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

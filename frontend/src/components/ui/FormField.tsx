import type { ReactNode } from 'react'

interface Props {
  id: string
  label: string
  error?: string
  optional?: boolean
  showRequiredIndicator?: boolean
  children: ReactNode
}

export default function FormField({ id, label, error, optional, showRequiredIndicator = true, children }: Props) {
  return <div>
    <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-sm font-medium text-ink">{label}{!optional && showRequiredIndicator && <span aria-hidden="true" className="text-brand-dark">*</span>}{optional && <span className="ml-1 text-xs font-normal text-muted">Opcional</span>}</label>
    {children}
    {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
  </div>
}

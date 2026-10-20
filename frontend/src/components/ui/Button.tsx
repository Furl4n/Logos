import type { ButtonHTMLAttributes } from 'react'

export default function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`inline-flex items-center justify-center gap-2 rounded-md border border-brand bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover ${className}`} {...props} />
}

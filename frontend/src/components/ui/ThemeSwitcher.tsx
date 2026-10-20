import type { Theme } from '../../contexts/ThemeContext.ts'
import { useTheme } from '../../hooks/useTheme'

const themes: { value: Theme; label: string; path: string }[] = [
  { value: 'light', label: 'Tema claro', path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5' },
  { value: 'dark', label: 'Tema escuro', path: 'M20.5 13.2A9 9 0 0 1 10.8 3.5a9 9 0 1 0 9.7 9.7Z' },
  { value: 'system', label: 'Usar tema do sistema', path: 'M3 4h18v13H3ZM8 21h8M12 17v4' },
]

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return <div role="group" aria-label="Tema" className="inline-flex shrink-0 gap-0.5 rounded-lg border border-line bg-canvas p-1">
    {themes.map(option => <button key={option.value} type="button" aria-label={option.label} title={option.label} aria-pressed={theme === option.value} onClick={() => setTheme(option.value)} className={`grid size-8 place-items-center rounded-md ${theme === option.value ? 'bg-surface text-brand-dark shadow-sm' : 'text-muted hover:bg-surface hover:text-ink'}`}>
      <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={option.path} /></svg>
    </button>)}
  </div>
}

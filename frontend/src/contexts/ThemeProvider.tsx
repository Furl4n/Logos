import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext } from './ThemeContext.ts'
import type { Theme } from './ThemeContext.ts'

const storageKey = 'logos.theme'
const mediaQuery = '(prefers-color-scheme: dark)'

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'light' || stored === 'dark') return stored
  } catch { /* O tema continua disponível se o navegador bloquear o armazenamento. */ }
  return 'system'
}

function subscribeSystem(listener: () => void) {
  const media = window.matchMedia(mediaQuery)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia(mediaQuery).matches)
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#141a21' : '#df5c22')
  }, [resolved])

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.storageArea === localStorage && (event.key === storageKey || event.key === null)) setTheme(readTheme())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  function changeTheme(value: Theme) {
    setTheme(value)
    try { localStorage.setItem(storageKey, value) } catch { /* Preferência mantida nesta sessão. */ }
  }

  return <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>{children}</ThemeContext.Provider>
}

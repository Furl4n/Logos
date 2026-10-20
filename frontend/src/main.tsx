import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './service/queryClient'
import ThemeProvider from './contexts/ThemeProvider'

// Remove o token salvo pela versão anterior; novas sessões usam apenas cookie HttpOnly.
sessionStorage.removeItem('logos.accessToken')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><QueryClientProvider client={queryClient}><App /></QueryClientProvider></ThemeProvider>
  </StrictMode>,
)

import type { ApiErrorResponse } from '../interfaces/Api'

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly data: ApiErrorResponse

  constructor(status: number, data: ApiErrorResponse) {
    super(data.detail)
    this.status = status
    this.data = data
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!['GET', 'HEAD', 'OPTIONS'].includes((options.method || 'GET').toUpperCase())) {
    headers.set('X-CSRF-Protection', '1')
  }
  if (options.body) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, credentials: 'include' })
  if (!response.ok) {
    const data: ApiErrorResponse = await response.json().catch(() => ({
      detail: 'Não foi possível concluir a solicitação.', code: 'HTTP_ERROR',
    }))
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') {
      window.dispatchEvent(new Event('auth:expired'))
    }
    throw new ApiError(response.status, data)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

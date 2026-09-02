import type { AppData } from './types'

async function parseError(response: Response) {
  try {
    const body = await response.json() as { error?: string }
    return body.error ?? 'Ocorreu um erro inesperado.'
  } catch {
    return 'Ocorreu um erro inesperado.'
  }
}

export async function getSession() {
  const response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error(await parseError(response))
  return (await response.json() as { authenticated: boolean }).authenticated
}

export async function login(password: string) {
  const response = await fetch('/api/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
  if (!response.ok) throw new Error(await parseError(response))
}

export async function logout() {
  const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
  if (!response.ok) throw new Error(await parseError(response))
}

export async function getRemoteState() {
  const response = await fetch('/api/state', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error(await parseError(response))
  return { data: await response.json() as AppData, etag: response.headers.get('x-state-etag') }
}

export async function putRemoteState(data: AppData, etag: string | null) {
  const response = await fetch('/api/state', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(etag ? { 'X-State-Etag': etag } : {})
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error(await parseError(response))
  return { data: await response.json() as AppData, etag: response.headers.get('x-state-etag') }
}

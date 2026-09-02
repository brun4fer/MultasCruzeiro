import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE_NAME = 'multas_admin_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7

function signature(value: string) {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const leftHash = createHash('sha256').update(left).digest()
  const rightHash = createHash('sha256').update(right).digest()
  return timingSafeEqual(leftHash, rightHash)
}

export function validPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD
  return Boolean(configuredPassword && safeEqual(password, configuredPassword))
}

export function createSessionCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  const value = `${expiresAt}.${signature(String(expiresAt))}`
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION_SECONDS}`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

export function isAdminRequest(request: VercelRequest) {
  const cookie = request.headers.cookie ?? ''
  const rawValue = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1)
  if (!rawValue) return false
  const [expiresRaw, suppliedSignature] = rawValue.split('.')
  const expiresAt = Number(expiresRaw)
  if (!expiresAt || expiresAt < Math.floor(Date.now() / 1000) || !suppliedSignature) return false
  return safeEqual(suppliedSignature, signature(expiresRaw))
}

export function sameOrigin(request: VercelRequest) {
  const origin = request.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

export function sendJson(response: VercelResponse, status: number, data: unknown, headers: Record<string, string> = {}) {
  response.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
  return response.status(status).json(data)
}

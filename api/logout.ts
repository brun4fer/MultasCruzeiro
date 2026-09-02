import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearSessionCookie, sameOrigin, sendJson } from './_auth.js'

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método não permitido.' })
  if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Pedido inválido.' })
  return sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': clearSessionCookie() })
}

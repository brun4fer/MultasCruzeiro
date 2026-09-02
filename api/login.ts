import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createSessionCookie, sameOrigin, sendJson, validPassword } from './_auth.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método não permitido.' })
  if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Pedido inválido.' })

  try {
    const body = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) as { password?: unknown }
    if (typeof body.password !== 'string' || !validPassword(body.password)) {
      return sendJson(response, 401, { error: 'Palavra-passe incorreta.' })
    }
    return sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': createSessionCookie() })
  } catch {
    return sendJson(response, 400, { error: 'Pedido inválido.' })
  }
}

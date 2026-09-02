import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isAdminRequest, sendJson } from './_auth.js'

export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Método não permitido.' })
  return sendJson(response, 200, { authenticated: isAdminRequest(request) })
}

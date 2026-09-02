import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyExpiredPenalties, ensureCurrentMonth } from '../src/domain.js'
import { isAdminRequest, sameOrigin, sendJson } from './_auth.js'
import { isAppData, readSharedState, writeSharedState } from './_state.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method === 'GET') {
    try {
      const { data, etag } = await readSharedState()
      return sendJson(response, 200, data, { 'X-State-Etag': etag })
    } catch (error) {
      console.error('Unable to read shared state', error)
      return sendJson(response, 500, { error: 'Não foi possível carregar os dados.' })
    }
  }

  if (request.method === 'PUT') {
    if (!sameOrigin(request)) return sendJson(response, 403, { error: 'Pedido inválido.' })
    if (!isAdminRequest(request)) return sendJson(response, 401, { error: 'Sessão de administrador necessária.' })
    const contentLength = Number(request.headers['content-length'] ?? 0)
    if (contentLength > 2_000_000) return sendJson(response, 413, { error: 'Dados demasiado grandes.' })

    try {
      const supplied: unknown = typeof request.body === 'string' ? JSON.parse(request.body) : request.body
      if (!isAppData(supplied)) return sendJson(response, 400, { error: 'Formato de dados inválido.' })
      const data = applyExpiredPenalties(ensureCurrentMonth(supplied))
      const blob = await writeSharedState(data)
      return sendJson(response, 200, data, { 'X-State-Etag': blob.etag })
    } catch (error) {
      console.error('Unable to write shared state', error)
      return sendJson(response, 500, { error: 'Não foi possível guardar os dados.' })
    }
  }

  return sendJson(response, 405, { error: 'Método não permitido.' })
}

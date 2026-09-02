import { BlobNotFoundError, get, put } from '@vercel/blob'
import { applyExpiredPenalties, createInitialData, ensureCurrentMonth } from '../src/domain.js'
import type { AppData } from '../src/types.js'

const STATE_PATH = 'multas-cruzeiro/state.json'
const strongEtag = (etag: string) => etag.replace(/^W\//, '')

export async function readSharedState() {
  try {
    const result = await get(STATE_PATH, { access: 'private' })
    if (!result || result.statusCode !== 200 || !result.stream) return createAndSaveState()
    const stored = await new Response(result.stream).json() as AppData
    const current = applyExpiredPenalties(ensureCurrentMonth(stored))
    const changed = JSON.stringify(stored) !== JSON.stringify(current)
    if (changed) {
      const blob = await writeSharedState(current)
      return { data: current, etag: strongEtag(blob.etag) }
    }
    return { data: current, etag: strongEtag(result.blob.etag) }
  } catch (error) {
    if (error instanceof BlobNotFoundError) return createAndSaveState()
    throw error
  }
}

async function createAndSaveState() {
  const data = createInitialData()
  const blob = await put(STATE_PATH, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    cacheControlMaxAge: 60
  })
  return { data, etag: strongEtag(blob.etag) }
}

export function writeSharedState(data: AppData) {
  return put(STATE_PATH, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    cacheControlMaxAge: 60
  })
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AppData>
  return candidate.version === 1
    && Array.isArray(candidate.people)
    && Array.isArray(candidate.fineTypes)
    && Array.isArray(candidate.entries)
    && Array.isArray(candidate.months)
    && Array.isArray(candidate.seasons)
    && typeof candidate.currentSeasonId === 'string'
}

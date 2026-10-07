import { describe, expect, it } from 'vitest'
import { closeMonth, createInitialData } from './domain'
import { buildMonthHistoryCsv } from './export'

describe('month history CSV export', () => {
  it('includes detailed entries, payment summary and protects spreadsheet formulas', () => {
    const now = new Date('2026-09-15T12:00:00.000Z')
    const data = createInitialData(now)
    data.entries.push({
      id: 'manual-entry',
      monthKey: '2026-09',
      personId: data.people[0].id,
      fineTypeId: 'a3',
      occurredOn: '2026-09-15',
      quantity: 1,
      unitAmount: 5,
      total: 5,
      note: '=SUM(A1:A2)',
      source: 'manual',
      createdAt: now.toISOString()
    })

    const csv = buildMonthHistoryCsv(closeMonth(data, '2026-09', now), '2026-09')

    expect(csv.startsWith('\uFEFFsep=;')).toBe(true)
    expect(csv).toContain('"REGISTOS"')
    expect(csv).toContain('"A3"')
    expect(csv).toContain('"\'=SUM(A1:A2)"')
    expect(csv).toContain('"RESUMO POR MEMBRO"')
    expect(csv).toContain('"TOTAL DE REGISTOS";"53"')
  })
})

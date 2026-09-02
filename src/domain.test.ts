import { describe, expect, it } from 'vitest'
import {
  addDaysDeadline,
  applyExpiredPenalties,
  calculateEntryTotal,
  closeMonth,
  createInitialData,
  ensureCurrentMonth,
  monthKeyFromDate,
  setSettlementPaid,
  startSeason
} from './domain'

describe('regras financeiras', () => {
  it('calcula multas fixas, por minuto e variáveis', () => {
    const data = createInitialData(new Date(2026, 8, 2, 12))
    const delay = data.fineTypes.find((fine) => fine.id === 'a2')!
    const lunch = data.fineTypes.find((fine) => fine.id === 'c1')!
    const fixed = data.fineTypes.find((fine) => fine.id === 'a3')!

    expect(calculateEntryTotal(delay, 8, 0)).toBe(4)
    expect(calculateEntryTotal(lunch, 1, 7.35)).toBe(7.35)
    expect(calculateEntryTotal(fixed, 25, 0)).toBe(5)
  })

  it('cria abertura de época e mensalidade para os 26 membros', () => {
    const data = createInitialData(new Date(2026, 8, 2, 12))
    expect(data.people).toHaveLength(26)
    expect(data.entries.filter((entry) => entry.fineTypeId === 'abertura')).toHaveLength(26)
    expect(data.entries.filter((entry) => entry.fineTypeId === 'mensal')).toHaveLength(26)
  })

  it('cria apenas uma mensalidade por pessoa num novo mês', () => {
    let data = createInitialData(new Date(2026, 8, 2, 12))
    data = ensureCurrentMonth(data, new Date(2026, 9, 1, 12))
    data = ensureCurrentMonth(data, new Date(2026, 9, 2, 12))
    const october = data.entries.filter((entry) => entry.monthKey === '2026-10' && entry.fineTypeId === 'mensal')
    expect(october).toHaveLength(26)
  })

  it('termina o prazo às 23:59 do sétimo dia após o fecho', () => {
    const deadline = new Date(addDaysDeadline(new Date(2026, 8, 30, 18).toISOString(), 7))
    expect(deadline.getDate()).toBe(7)
    expect(deadline.getHours()).toBe(23)
    expect(deadline.getMinutes()).toBe(59)
  })

  it('duplica uma só vez o valor pendente depois do prazo', () => {
    const closeTime = new Date(2026, 8, 30, 18)
    let data = createInitialData(closeTime)
    data = closeMonth(data, monthKeyFromDate(closeTime), closeTime)
    const afterDeadline = new Date(2026, 9, 8, 12)
    data = applyExpiredPenalties(data, afterDeadline)
    data = applyExpiredPenalties(data, new Date(2026, 9, 20, 12))

    const settlement = data.months[0].settlements[0]
    expect(settlement.baseAmount).toBe(1.5)
    expect(settlement.penaltyAmount).toBe(1.5)
    expect(settlement.finalAmount).toBe(3)
  })

  it('não penaliza quem foi marcado como pago dentro do prazo', () => {
    const closeTime = new Date(2026, 8, 30, 18)
    let data = createInitialData(closeTime)
    const monthKey = monthKeyFromDate(closeTime)
    data = closeMonth(data, monthKey, closeTime)
    const personId = data.months[0].settlements[0].personId
    data = setSettlementPaid(data, monthKey, personId, true, new Date(2026, 9, 2, 12))
    data = applyExpiredPenalties(data, new Date(2026, 9, 20, 12))

    const settlement = data.months[0].settlements.find((item) => item.personId === personId)!
    expect(settlement.status).toBe('paid')
    expect(settlement.penaltyAmount).toBe(0)
    expect(settlement.finalAmount).toBe(1.5)
  })

  it('aplica abertura e permite mensalidades numa nova época', () => {
    const now = new Date(2026, 8, 2, 12)
    let data = createInitialData(now)
    data.seasons[0].status = 'closed'
    data.seasons[0].closingApplied = true
    data = startSeason(data, '2027/2028', now)

    expect(data.seasons.at(-1)?.label).toBe('2027/2028')
    expect(data.seasons.at(-1)?.status).toBe('open')
    expect(data.currentSeasonId).toBe(data.seasons.at(-1)?.id)
  })
})

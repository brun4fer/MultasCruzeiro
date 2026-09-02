import { INITIAL_FINE_TYPES, INITIAL_PEOPLE } from './catalog.js'
import type { AppData, FineEntry, FineType, MonthRecord, Person, Settlement } from './types.js'

export const STORAGE_KEY = 'multas-cruzeiro-data-v1'

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export const monthKeyFromDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export const todayInputValue = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const monthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)

export const formatDate = (value: string | null, includeTime = false) => {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-PT', includeTime
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { dateStyle: 'short' }).format(new Date(value))
}

export const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

export function seasonLabelForDate(date: Date) {
  const startYear = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1
  return `${startYear}/${startYear + 1}`
}

export function addDaysDeadline(closedAt: string, days: number) {
  const deadline = new Date(closedAt)
  deadline.setDate(deadline.getDate() + days)
  deadline.setHours(23, 59, 59, 999)
  return deadline.toISOString()
}

function automaticEntry(person: Person, fine: FineType, monthKey: string, occurredOn: string): FineEntry {
  return {
    id: createId(),
    monthKey,
    personId: person.id,
    fineTypeId: fine.id,
    occurredOn,
    quantity: 1,
    unitAmount: fine.unitAmount ?? 0,
    total: fine.unitAmount ?? 0,
    note: '',
    source: 'automatic',
    createdAt: new Date().toISOString()
  }
}

function newOpenMonth(key: string, now: Date): MonthRecord {
  return { key, status: 'open', createdAt: now.toISOString(), closedAt: null, deadline: null, settlements: [] }
}

function applyAutomaticCharge(data: AppData, fine: FineType, monthKey: string, date: string) {
  const existingPeople = new Set(
    data.entries.filter((entry) => entry.monthKey === monthKey && entry.fineTypeId === fine.id).map((entry) => entry.personId)
  )
  for (const person of data.people.filter((candidate) => candidate.active)) {
    if (!existingPeople.has(person.id)) data.entries.push(automaticEntry(person, fine, monthKey, date))
  }
}

export function createInitialData(now = new Date()): AppData {
  const currentMonthKey = monthKeyFromDate(now)
  const seasonId = `season-${seasonLabelForDate(now).replace('/', '-')}`
  const data: AppData = {
    version: 1,
    people: structuredClone(INITIAL_PEOPLE),
    fineTypes: structuredClone(INITIAL_FINE_TYPES),
    entries: [],
    months: [newOpenMonth(currentMonthKey, now)],
    seasons: [{
      id: seasonId,
      label: seasonLabelForDate(now),
      status: 'open',
      openedAt: now.toISOString(),
      closedAt: null,
      openingApplied: true,
      closingApplied: false
    }],
    currentSeasonId: seasonId
  }
  applyAutomaticCharge(data, data.fineTypes.find((fine) => fine.automatic === 'season_opening')!, currentMonthKey, todayInputValue(now))
  applyAutomaticCharge(data, data.fineTypes.find((fine) => fine.automatic === 'monthly')!, currentMonthKey, todayInputValue(now))
  return data
}

export function ensureCurrentMonth(source: AppData, now = new Date()): AppData {
  const data = structuredClone(source)
  const key = monthKeyFromDate(now)
  if (!data.months.some((month) => month.key === key)) {
    data.months.push(newOpenMonth(key, now))
  }
  const month = data.months.find((candidate) => candidate.key === key)!
  const season = data.seasons.find((candidate) => candidate.id === data.currentSeasonId)
  if (month.status === 'open' && season?.status === 'open') {
    const monthlyFine = data.fineTypes.find((fine) => fine.automatic === 'monthly')
    if (monthlyFine) applyAutomaticCharge(data, monthlyFine, key, todayInputValue(now))
  }
  return applyExpiredPenalties(data, now)
}

export function startSeason(source: AppData, label: string, now = new Date()): AppData {
  const data = ensureCurrentMonth(source, now)
  const currentSeason = data.seasons.find((candidate) => candidate.id === data.currentSeasonId)
  const key = monthKeyFromDate(now)
  const month = data.months.find((candidate) => candidate.key === key)
  if (!label.trim() || currentSeason?.status === 'open' || month?.status !== 'open') return data

  const seasonId = `season-${createId()}`
  data.seasons.push({
    id: seasonId,
    label: label.trim(),
    status: 'open',
    openedAt: now.toISOString(),
    closedAt: null,
    openingApplied: true,
    closingApplied: false
  })
  data.currentSeasonId = seasonId
  const openingFine = data.fineTypes.find((fine) => fine.automatic === 'season_opening')
  const monthlyFine = data.fineTypes.find((fine) => fine.automatic === 'monthly')
  if (openingFine) applyAutomaticCharge(data, openingFine, key, todayInputValue(now))
  if (monthlyFine) applyAutomaticCharge(data, monthlyFine, key, todayInputValue(now))
  return data
}

export function entriesForMonth(data: AppData, monthKey: string) {
  return data.entries.filter((entry) => entry.monthKey === monthKey)
}

export function totalsByPerson(data: AppData, monthKey: string) {
  const totals = new Map<string, number>()
  for (const entry of entriesForMonth(data, monthKey)) {
    totals.set(entry.personId, roundMoney((totals.get(entry.personId) ?? 0) + entry.total))
  }
  return totals
}

export function closeMonth(source: AppData, monthKey: string, now = new Date()): AppData {
  const data = structuredClone(source)
  const month = data.months.find((candidate) => candidate.key === monthKey)
  if (!month || month.status === 'closed') return data
  const closedAt = now.toISOString()
  const totals = totalsByPerson(data, monthKey)
  month.status = 'closed'
  month.closedAt = closedAt
  month.deadline = addDaysDeadline(closedAt, 7)
  month.settlements = [...totals.entries()]
    .filter(([, total]) => total > 0)
    .map(([personId, total]): Settlement => ({
      personId,
      baseAmount: total,
      penaltyAmount: 0,
      finalAmount: total,
      status: 'pending',
      paidAt: null,
      penaltyAppliedAt: null
    }))
  return data
}

export function applyExpiredPenalties(source: AppData, now = new Date()): AppData {
  const data = structuredClone(source)
  for (const month of data.months) {
    if (month.status !== 'closed' || !month.deadline || new Date(month.deadline) >= now) continue
    for (const settlement of month.settlements) {
      if (settlement.status === 'pending' && !settlement.penaltyAppliedAt) {
        settlement.penaltyAmount = settlement.baseAmount
        settlement.finalAmount = roundMoney(settlement.baseAmount * 2)
        settlement.penaltyAppliedAt = now.toISOString()
      }
    }
  }
  return data
}

export function setSettlementPaid(source: AppData, monthKey: string, personId: string, paid: boolean, now = new Date()) {
  let data = applyExpiredPenalties(source, now)
  data = structuredClone(data)
  const settlement = data.months.find((month) => month.key === monthKey)?.settlements.find((item) => item.personId === personId)
  if (!settlement) return data
  settlement.status = paid ? 'paid' : 'pending'
  settlement.paidAt = paid ? now.toISOString() : null
  return paid ? data : applyExpiredPenalties(data, now)
}

export function closeSeason(source: AppData, now = new Date()): AppData {
  const data = ensureCurrentMonth(source, now)
  const season = data.seasons.find((candidate) => candidate.id === data.currentSeasonId)
  if (!season || season.closingApplied) return data
  const key = monthKeyFromDate(now)
  const month = data.months.find((candidate) => candidate.key === key)
  if (!month || month.status !== 'open') return data
  const closingFine = data.fineTypes.find((fine) => fine.automatic === 'season_closing')
  if (closingFine) applyAutomaticCharge(data, closingFine, key, todayInputValue(now))
  season.closingApplied = true
  season.status = 'closed'
  season.closedAt = now.toISOString()
  return data
}

export function calculateEntryTotal(fine: FineType, quantity: number, variableAmount: number) {
  if (fine.amountType === 'variable') return roundMoney(variableAmount)
  return roundMoney((fine.unitAmount ?? 0) * (fine.amountType === 'per_minute' ? quantity : 1))
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialData()
    return ensureCurrentMonth(JSON.parse(raw) as AppData)
  } catch {
    return createInitialData()
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

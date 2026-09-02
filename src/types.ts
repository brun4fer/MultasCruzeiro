export type PersonRole = 'player' | 'staff'
export type FineAmountType = 'fixed' | 'per_minute' | 'variable'
export type FineAudience = PersonRole | 'all'
export type MonthStatus = 'open' | 'closed'
export type PaymentStatus = 'pending' | 'paid'

export interface Person {
  id: string
  name: string
  role: PersonRole
  active: boolean
}

export interface FineType {
  id: string
  code: string
  name: string
  category: 'Multas' | 'Disciplina' | 'Equipa técnica' | 'Pagamentos obrigatórios'
  amountType: FineAmountType
  unitAmount: number | null
  audience: FineAudience
  automatic?: 'season_opening' | 'season_closing' | 'monthly'
  active: boolean
}

export interface FineEntry {
  id: string
  monthKey: string
  personId: string
  fineTypeId: string
  occurredOn: string
  quantity: number
  unitAmount: number
  total: number
  note: string
  source: 'manual' | 'automatic'
  createdAt: string
}

export interface Settlement {
  personId: string
  baseAmount: number
  penaltyAmount: number
  finalAmount: number
  status: PaymentStatus
  paidAt: string | null
  penaltyAppliedAt: string | null
}

export interface MonthRecord {
  key: string
  status: MonthStatus
  createdAt: string
  closedAt: string | null
  deadline: string | null
  settlements: Settlement[]
}

export interface Season {
  id: string
  label: string
  status: 'open' | 'closed'
  openedAt: string
  closedAt: string | null
  openingApplied: boolean
  closingApplied: boolean
}

export interface AppData {
  version: 1
  people: Person[]
  fineTypes: FineType[]
  entries: FineEntry[]
  months: MonthRecord[]
  seasons: Season[]
  currentSeasonId: string
}

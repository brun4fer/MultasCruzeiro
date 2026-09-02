import type { FineType, Person } from './types.js'

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const players = [
  'Fontes',
  'Ruben',
  'Gustavo',
  'Eduardo',
  'Bruno',
  'Chico',
  'Tininho',
  'Vieira',
  'Dani',
  'Pedro Guimaraes',
  'Nuno',
  'Miranda',
  'Miguel',
  'Jorge',
  'Joao',
  'Hugo',
  'Gurgo',
  'Gonçalo',
  'Filipe',
  'Fernando',
  'Branco',
  'Andre'
]

const staff = ['Ferro', 'Jaime', 'Gusto', 'Pedro']

export const INITIAL_PEOPLE: Person[] = [
  ...players.map((name) => ({ id: `player-${slug(name)}`, name, role: 'player' as const, active: true })),
  ...staff.map((name) => ({ id: `staff-${slug(name)}`, name, role: 'staff' as const, active: true }))
]

const fixed = (
  code: string,
  name: string,
  amount: number,
  category: FineType['category'] = 'Multas',
  audience: FineType['audience'] = 'player'
): FineType => ({ id: code.toLowerCase(), code, name, category, amountType: 'fixed', unitAmount: amount, audience, active: true })

const minutes = (code: string, name: string, amount: number, audience: FineType['audience'] = 'player'): FineType => ({
  id: code.toLowerCase(),
  code,
  name,
  category: audience === 'staff' ? 'Equipa técnica' : 'Multas',
  amountType: 'per_minute',
  unitAmount: amount,
  audience,
  active: true
})

export const INITIAL_FINE_TYPES: FineType[] = [
  minutes('A2', 'Atraso ao treino', 0.5),
  fixed('A3', 'Faltar ao treino sem aviso prévio', 5),
  fixed('A6', 'Esquecer material em qualquer local', 0.5),
  minutes('B3', 'Atraso à concentração do jogo', 1),
  fixed('B4', 'Faltar ao jogo depois de convocado', 5),
  fixed('B5', 'Faltar ao jogo sem aviso prévio', 10),
  fixed('B7', 'Falta de material para o jogo', 1),
  fixed('B8', 'Tocar no telemóvel durante a palestra', 0.8),
  minutes('B9', 'Atraso ao almoço sem aviso prévio', 0.3),
  {
    id: 'c1', code: 'C1', name: 'Faltar ao almoço após confirmação', category: 'Multas',
    amountType: 'variable', unitAmount: null, audience: 'player', active: true
  },
  fixed('C2', 'Faltar ao almoço com aviso prévio justificado', 1),
  fixed('C3', 'Desrespeitar colega', 5, 'Disciplina'),
  fixed('C4', 'Desrespeitar treinador/diretor/fisioterapeuta', 5, 'Disciplina'),
  fixed('C5', 'Cartão amarelo', 0.3, 'Disciplina'),
  fixed('C6', 'Cartão amarelo por palavras', 1, 'Disciplina'),
  fixed('C7', 'Duplo amarelo', 0.8, 'Disciplina'),
  fixed('C8', 'Cartão vermelho', 2, 'Disciplina'),
  fixed('C9', 'Cartão vermelho antidesportivo', 7, 'Disciplina'),
  minutes('D1', 'Atraso ao jogo', 1.5, 'staff'),
  minutes('D2', 'Atraso ao treino', 2, 'staff'),
  fixed('D3', 'Utilizar telemóvel no balneário', 0.8, 'Equipa técnica', 'staff'),
  fixed('D4', 'Tocar telemóvel no balneário', 0.8, 'Equipa técnica', 'staff'),
  fixed('D5', 'Expulsão', 5, 'Equipa técnica', 'staff'),
  fixed('G', 'Faltar ao treino com justificação válida', 0.2, 'Equipa técnica', 'staff'),
  {
    ...fixed('ABERTURA', 'Abertura de caixa', 1, 'Pagamentos obrigatórios', 'all'),
    automatic: 'season_opening'
  },
  {
    ...fixed('FECHO', 'Fecho de caixa', 1, 'Pagamentos obrigatórios', 'all'),
    automatic: 'season_closing'
  },
  {
    ...fixed('MENSAL', 'Pagamento mensal para a caixa', 0.5, 'Pagamentos obrigatórios', 'all'),
    automatic: 'monthly'
  }
]

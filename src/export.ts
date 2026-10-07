import { monthLabel, roundMoney, totalsByPerson } from './domain'
import type { AppData } from './types'

const csvCell = (value: string | number) => {
  let text = String(value)
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

const csvRow = (values: (string | number)[]) => values.map(csvCell).join(';')
const csvMoney = (value: number) => roundMoney(value).toFixed(2).replace('.', ',')

const csvDate = (value: string | null) => {
  if (!value) return ''
  const date = value.slice(0, 10).split('-')
  return date.length === 3 ? `${date[2]}/${date[1]}/${date[0]}` : value
}

export function buildMonthHistoryCsv(data: AppData, monthKey: string) {
  const month = data.months.find((item) => item.key === monthKey)
  if (!month) throw new Error('Mês não encontrado.')

  const settlements = new Map(month.settlements.map((item) => [item.personId, item]))
  const entries = data.entries
    .filter((entry) => entry.monthKey === monthKey)
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)
      || (data.people.find((person) => person.id === a.personId)?.name ?? '')
        .localeCompare(data.people.find((person) => person.id === b.personId)?.name ?? '', 'pt-PT'))

  const lines = [
    'sep=;',
    csvRow([`Histórico de multas — ${monthLabel(monthKey)}`]),
    csvRow(['Estado do mês', month.status === 'closed' ? 'Fechado' : 'Aberto']),
    csvRow(['Data de fecho', csvDate(month.closedAt)]),
    csvRow(['Prazo de pagamento', csvDate(month.deadline)]),
    '',
    csvRow(['REGISTOS']),
    csvRow(['Data', 'Membro', 'Função', 'Código', 'Multa', 'Quantidade/Minutos', 'Valor unitário (€)', 'Total (€)', 'Origem', 'Observação', 'Pagamento'])
  ]

  for (const entry of entries) {
    const person = data.people.find((item) => item.id === entry.personId)
    const fine = data.fineTypes.find((item) => item.id === entry.fineTypeId)
    const settlement = settlements.get(entry.personId)
    const payment = month.status === 'open' ? 'Mês aberto' : settlement?.status === 'paid' ? 'Pago' : 'Pendente'
    lines.push(csvRow([
      csvDate(entry.occurredOn),
      person?.name ?? 'Membro removido',
      person?.role === 'staff' ? 'Equipa técnica' : 'Jogador',
      fine?.code ?? '',
      fine?.name ?? 'Multa removida',
      entry.quantity,
      csvMoney(entry.unitAmount),
      csvMoney(entry.total),
      entry.source === 'automatic' ? 'Automático' : 'Manual',
      entry.note,
      payment
    ]))
  }

  lines.push('', csvRow(['RESUMO POR MEMBRO']))
  lines.push(csvRow(['Membro', 'Função', 'Original (€)', 'Penalização (€)', 'Total final (€)', 'Estado', 'Pago em']))

  if (month.status === 'closed') {
    for (const settlement of [...month.settlements].sort((a, b) =>
      (data.people.find((person) => person.id === a.personId)?.name ?? '')
        .localeCompare(data.people.find((person) => person.id === b.personId)?.name ?? '', 'pt-PT'))) {
      const person = data.people.find((item) => item.id === settlement.personId)
      lines.push(csvRow([
        person?.name ?? 'Membro removido',
        person?.role === 'staff' ? 'Equipa técnica' : 'Jogador',
        csvMoney(settlement.baseAmount),
        csvMoney(settlement.penaltyAmount),
        csvMoney(settlement.finalAmount),
        settlement.status === 'paid' ? 'Pago' : settlement.penaltyAmount ? 'Em atraso' : 'Pendente',
        csvDate(settlement.paidAt)
      ]))
    }
  } else {
    const totals = totalsByPerson(data, monthKey)
    for (const [personId, total] of [...totals].sort((a, b) =>
      (data.people.find((person) => person.id === a[0])?.name ?? '')
        .localeCompare(data.people.find((person) => person.id === b[0])?.name ?? '', 'pt-PT'))) {
      const person = data.people.find((item) => item.id === personId)
      lines.push(csvRow([
        person?.name ?? 'Membro removido',
        person?.role === 'staff' ? 'Equipa técnica' : 'Jogador',
        csvMoney(total),
        csvMoney(0),
        csvMoney(total),
        'Mês aberto',
        ''
      ]))
    }
  }

  const total = entries.reduce((sum, entry) => sum + entry.total, 0)
  lines.push('', csvRow(['TOTAL DE REGISTOS', entries.length]), csvRow(['TOTAL ORIGINAL (€)', csvMoney(total)]))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

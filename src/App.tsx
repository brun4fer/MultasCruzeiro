import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  BadgeEuro,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Eye,
  Euro,
  History,
  Home,
  LockKeyhole,
  LogIn,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  TrendingUp,
  UsersRound,
  WalletCards,
  Wifi,
  WifiOff,
  X
} from 'lucide-react'
import {
  applyExpiredPenalties,
  calculateEntryTotal,
  closeMonth,
  closeSeason,
  createId,
  entriesForMonth,
  formatDate,
  formatMoney,
  loadData,
  monthKeyFromDate,
  monthLabel,
  saveData,
  setSettlementPaid,
  startSeason,
  todayInputValue,
  totalsByPerson
} from './domain'
import { getRemoteState, getSession, login, logout, putRemoteState } from './remote'
import type { AppData, FineEntry, FineType, Person, PersonRole } from './types'

type Page = 'home' | 'add' | 'month' | 'payments' | 'history' | 'settings'

const navItems: { page: Page; label: string; icon: typeof Home }[] = [
  { page: 'home', label: 'Início', icon: Home },
  { page: 'add', label: 'Registar', icon: Plus },
  { page: 'month', label: 'Mês', icon: CalendarDays },
  { page: 'payments', label: 'Pagamentos', icon: WalletCards },
  { page: 'history', label: 'Histórico', icon: History }
]

const pageTitles: Record<Page, string> = {
  home: 'Visão geral',
  add: 'Registar multa',
  month: 'Mês atual',
  payments: 'Pagamentos',
  history: 'Histórico',
  settings: 'Definições'
}

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [page, setPage] = useState<Page>('home')
  const [toast, setToast] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(import.meta.env.DEV)
  const [authLoading, setAuthLoading] = useState(!import.meta.env.DEV)
  const [loginOpen, setLoginOpen] = useState(false)
  const [remoteReady, setRemoteReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>(import.meta.env.DEV ? 'saved' : 'loading')
  const etagRef = useRef<string | null>(null)
  const currentMonthKey = monthKeyFromDate(new Date())

  useEffect(() => {
    if (import.meta.env.DEV) return
    let active = true
    Promise.all([getSession(), getRemoteState()])
      .then(([authenticated, remote]) => {
        if (!active) return
        etagRef.current = remote.etag
        setData(remote.data)
        setIsAdmin(authenticated)
        setRemoteReady(true)
        setSyncStatus('saved')
      })
      .catch(() => {
        if (active) setSyncStatus('error')
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    saveData(data)
    if (!remoteReady || !isAdmin || import.meta.env.DEV) return
    setSyncStatus('saving')
    const timer = window.setTimeout(() => {
      putRemoteState(data, etagRef.current)
        .then((remote) => {
          etagRef.current = remote.etag
          setSyncStatus('saved')
        })
        .catch((error: Error) => {
          setSyncStatus('error')
          setToast(error.message)
        })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [data, isAdmin, remoteReady])

  useEffect(() => {
    if (!isAdmin && (page === 'add' || page === 'settings')) setPage('home')
  }, [isAdmin, page])

  useEffect(() => {
    const timer = window.setInterval(() => setData((current) => applyExpiredPenalties(current)), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = (message: string) => setToast(message)

  const addEntry = (entry: FineEntry) => {
    setData((current) => ({ ...current, entries: [...current.entries, entry] }))
    notify('Multa registada com sucesso.')
    setPage('month')
  }

  const deleteEntry = (entryId: string) => {
    setData((current) => ({ ...current, entries: current.entries.filter((entry) => entry.id !== entryId) }))
    notify('Registo removido.')
  }

  const handleCloseMonth = () => {
    setData((current) => closeMonth(current, currentMonthKey))
    notify('Mês fechado. O prazo de 7 dias começou.')
    setPage('payments')
  }

  const handlePayment = (monthKey: string, personId: string, paid: boolean) => {
    setData((current) => setSettlementPaid(current, monthKey, personId, paid))
    notify(paid ? 'Pagamento confirmado.' : 'Pagamento marcado como pendente.')
  }

  const handleRename = (personId: string, name: string) => {
    if (!name.trim()) return
    setData((current) => ({
      ...current,
      people: current.people.map((person) => person.id === personId ? { ...person, name: name.trim() } : person)
    }))
  }

  const handleActive = (personId: string) => {
    setData((current) => ({
      ...current,
      people: current.people.map((person) => person.id === personId ? { ...person, active: !person.active } : person)
    }))
    notify('Estado do membro atualizado.')
  }

  const handleAddPerson = (name: string, role: PersonRole) => {
    const person: Person = { id: createId(), name: name.trim(), role, active: true }
    setData((current) => ({ ...current, people: [...current.people, person] }))
    notify('Membro adicionado.')
  }

  const handleFinePrice = (fineId: string, amount: number) => {
    if (amount < 0) return
    setData((current) => ({
      ...current,
      fineTypes: current.fineTypes.map((fine) => fine.id === fineId ? { ...fine, unitAmount: amount } : fine)
    }))
    notify('Valor atualizado para futuros registos.')
  }

  const handleCloseSeason = () => {
    setData((current) => closeSeason(current))
    notify('Fecho de caixa aplicado a todos os membros ativos.')
  }

  const handleStartSeason = (label: string) => {
    setData((current) => startSeason(current, label))
    notify(`Época ${label} iniciada.`)
  }

  const handleLogin = async (password: string) => {
    await login(password)
    const remote = await getRemoteState()
    etagRef.current = remote.etag
    setData(remote.data)
    setRemoteReady(true)
    setIsAdmin(true)
    setLoginOpen(false)
    notify('Sessão de administrador iniciada.')
  }

  const handleLogout = async () => {
    await logout()
    setIsAdmin(false)
    setPage('home')
    notify('Sessão terminada. A aplicação está em modo de consulta.')
  }

  const currentMonth = data.months.find((month) => month.key === currentMonthKey)
  const availableNavItems = navItems.filter((item) => isAdmin || item.page !== 'add')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navegação principal">
          {availableNavItems.map((item) => <NavButton key={item.page} item={item} active={page === item.page} onClick={() => setPage(item.page)} />)}
        </nav>
        <button className={`side-settings ${page === 'settings' ? 'active' : ''}`} onClick={() => isAdmin ? setPage('settings') : setLoginOpen(true)}>
          {isAdmin ? <Settings size={20} /> : <LogIn size={20} />} {isAdmin ? 'Definições' : 'Área de administrador'}
        </button>
      </aside>

      <div className="main-column">
        <header className="mobile-header">
          <Brand compact />
          <button className="icon-button" aria-label={isAdmin ? 'Abrir definições' : 'Entrar como administrador'} onClick={() => isAdmin ? setPage('settings') : setLoginOpen(true)}>
            {isAdmin ? <Settings size={21} /> : <LogIn size={21} />}
          </button>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <div>
              {page === 'settings' && <button className="text-button back-button" onClick={() => setPage('home')}><ArrowLeft size={16} /> Voltar</button>}
              <p className="eyebrow">A.D. Cruzeiro Silvalde</p>
              <h1>{pageTitles[page]}</h1>
            </div>
            <div className="heading-badges">
              {isAdmin && <div className={`sync-chip ${syncStatus}`}>
                {syncStatus === 'error' ? <WifiOff size={13} /> : <Wifi size={13} />}
                {syncStatus === 'saving' ? 'A guardar…' : syncStatus === 'error' ? 'Erro ao sincronizar' : 'Administrador'}
              </div>}
              <div className="season-chip">Época {data.seasons.find((season) => season.id === data.currentSeasonId)?.label}</div>
            </div>
          </div>

          {!authLoading && !isAdmin && <div className="viewer-banner"><Eye size={18} /><span><strong>Modo de consulta</strong> Só o administrador pode alterar os dados.</span><button onClick={() => setLoginOpen(true)}>Entrar</button></div>}

          {page === 'home' && <Dashboard data={data} currentMonthKey={currentMonthKey} setPage={setPage} isAdmin={isAdmin} />}
          {page === 'add' && isAdmin && <AddFine data={data} currentMonthKey={currentMonthKey} onAdd={addEntry} />}
          {page === 'month' && <CurrentMonth data={data} currentMonthKey={currentMonthKey} onDelete={deleteEntry} onClose={handleCloseMonth} setPage={setPage} isAdmin={isAdmin} />}
          {page === 'payments' && <Payments data={data} onPayment={handlePayment} isAdmin={isAdmin} />}
          {page === 'history' && <HistoryPage data={data} />}
          {page === 'settings' && (
            <SettingsPage
              data={data}
              onRename={handleRename}
              onActive={handleActive}
              onAddPerson={handleAddPerson}
              onFinePrice={handleFinePrice}
              onCloseSeason={handleCloseSeason}
              onStartSeason={handleStartSeason}
              onLogout={handleLogout}
            />
          )}
        </main>

        <nav className={`bottom-nav ${isAdmin ? 'admin' : 'viewer'}`} aria-label="Navegação principal">
          {availableNavItems.map((item) => <NavButton key={item.page} item={item} active={page === item.page} onClick={() => setPage(item.page)} />)}
        </nav>
      </div>

      {toast && <div className="toast"><CheckCircle2 size={19} /> {toast}</div>}
      {!currentMonth && <div className="toast error"><CircleAlert size={19} /> Não foi possível abrir o mês atual.</div>}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLogin={handleLogin} />}
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <div className="mini-shield"><span>AD</span><span>CS</span></div>
      <div><strong>Multas</strong><span>Cruzeiro Silvalde</span></div>
    </div>
  )
}

function NavButton({ item, active, onClick }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={21} strokeWidth={active ? 2.5 : 2} />
      <span>{item.label}</span>
    </button>
  )
}

function Dashboard({ data, currentMonthKey, setPage, isAdmin }: { data: AppData; currentMonthKey: string; setPage: (page: Page) => void; isAdmin: boolean }) {
  const entries = entriesForMonth(data, currentMonthKey)
  const totals = totalsByPerson(data, currentMonthKey)
  const monthTotal = [...totals.values()].reduce((sum, total) => sum + total, 0)
  const leader = [...totals.entries()].sort((a, b) => b[1] - a[1])[0]
  const closedMonths = data.months.filter((month) => month.status === 'closed')
  const pending = closedMonths.flatMap((month) => month.settlements).filter((item) => item.status === 'pending')
  const pendingTotal = pending.reduce((sum, item) => sum + item.finalAmount, 0)
  const latestEntries = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)

  return (
    <div className="stack-xl">
      <section className="hero-card">
        <div>
          <span className="status-pill"><span className="status-dot" /> {monthLabel(currentMonthKey)} em curso</span>
          <h2>{formatMoney(monthTotal)}</h2>
          <p>Total acumulado por {totals.size} membros este mês.</p>
        </div>
        {isAdmin && <button className="primary-button light" onClick={() => setPage('add')}><Plus size={20} /> Registar multa</button>}
      </section>

      <section className="stats-grid">
        <StatCard icon={ReceiptText} label="Movimentos" value={String(entries.length)} detail="no mês atual" />
        <StatCard icon={TrendingUp} label="Maior total" value={leader ? formatMoney(leader[1]) : formatMoney(0)} detail={leader ? data.people.find((p) => p.id === leader[0])?.name ?? '' : 'Sem registos'} />
        <StatCard icon={Clock3} label="Por receber" value={formatMoney(pendingTotal)} detail={`${pending.length} pagamentos pendentes`} danger={pendingTotal > 0} />
      </section>

      <section className="content-grid">
        <div className="card">
          <CardHeader title="Últimos movimentos" action="Ver mês" onAction={() => setPage('month')} />
          {latestEntries.length ? (
            <div className="activity-list">
              {latestEntries.map((entry) => <EntryRow key={entry.id} entry={entry} data={data} />)}
            </div>
          ) : <EmptyState icon={ReceiptText} title="Ainda sem movimentos" text="Regista a primeira multa deste mês." />}
        </div>
        <div className="card quick-card">
          <h3>Acesso rápido</h3>
          {isAdmin && <button onClick={() => setPage('add')}><span className="quick-icon red"><Plus size={20} /></span><span><strong>Nova multa</strong><small>Registar em poucos segundos</small></span><ChevronRight size={18} /></button>}
          <button onClick={() => setPage('payments')}><span className="quick-icon gold"><WalletCards size={20} /></span><span><strong>Pagamentos</strong><small>Confirmar valores recebidos</small></span><ChevronRight size={18} /></button>
          <button onClick={() => setPage('history')}><span className="quick-icon dark"><Archive size={20} /></span><span><strong>Histórico</strong><small>Consultar meses anteriores</small></span><ChevronRight size={18} /></button>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, detail, danger = false }: { icon: typeof Home; label: string; value: string; detail: string; danger?: boolean }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${danger ? 'danger' : ''}`}><Icon size={21} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </div>
  )
}

function AddFine({ data, currentMonthKey, onAdd }: { data: AppData; currentMonthKey: string; onAdd: (entry: FineEntry) => void }) {
  const [personId, setPersonId] = useState('')
  const [fineId, setFineId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [variableAmount, setVariableAmount] = useState(0)
  const [occurredOn, setOccurredOn] = useState(todayInputValue())
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const month = data.months.find((candidate) => candidate.key === currentMonthKey)
  const person = data.people.find((candidate) => candidate.id === personId)
  const availableFines = data.fineTypes.filter((fine) => fine.active && !fine.automatic && (!person || fine.audience === person.role || fine.audience === 'all'))
  const fine = data.fineTypes.find((candidate) => candidate.id === fineId)
  const total = fine ? calculateEntryTotal(fine, quantity, variableAmount) : 0
  const people = data.people.filter((candidate) => candidate.active && candidate.name.toLocaleLowerCase('pt-PT').includes(search.toLocaleLowerCase('pt-PT')))

  const selectPerson = (id: string) => {
    setPersonId(id)
    setFineId('')
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!person || !fine || total <= 0 || month?.status !== 'open') return
    onAdd({
      id: createId(),
      monthKey: currentMonthKey,
      personId,
      fineTypeId: fine.id,
      occurredOn,
      quantity: fine.amountType === 'per_minute' ? quantity : 1,
      unitAmount: fine.amountType === 'variable' ? variableAmount : fine.unitAmount ?? 0,
      total,
      note: note.trim(),
      source: 'manual',
      createdAt: new Date().toISOString()
    })
  }

  if (month?.status === 'closed') {
    return <EmptyState icon={LockKeyhole} title="Este mês está fechado" text="Já não é possível adicionar multas ao mês atual." />
  }

  return (
    <form className="fine-form" onSubmit={submit}>
      <section className="card form-section">
        <div className="step-title"><span>1</span><div><h3>Escolher membro</h3><p>Jogador ou elemento da equipa técnica</p></div></div>
        <label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar nome..." /></label>
        <div className="people-picker">
          {people.map((item) => (
            <button type="button" key={item.id} className={personId === item.id ? 'selected' : ''} onClick={() => selectPerson(item.id)}>
              <span className="avatar">{initials(item.name)}</span>
              <span>{item.name}<small>{item.role === 'player' ? 'Jogador' : 'Equipa técnica'}</small></span>
              {personId === item.id && <Check size={18} />}
            </button>
          ))}
        </div>
      </section>

      <section className={`card form-section ${!person ? 'disabled-section' : ''}`}>
        <div className="step-title"><span>2</span><div><h3>Escolher multa</h3><p>As opções dependem do tipo de membro</p></div></div>
        {person ? (
          <div className="fine-picker">
            {availableFines.map((item) => (
              <button type="button" key={item.id} className={fineId === item.id ? 'selected' : ''} onClick={() => setFineId(item.id)}>
                <span className="fine-code">{item.code}</span>
                <span><strong>{item.name}</strong><small>{finePriceLabel(item)}</small></span>
                {fineId === item.id && <Check size={18} />}
              </button>
            ))}
          </div>
        ) : <p className="section-hint">Escolhe primeiro um membro.</p>}
      </section>

      <section className={`card form-section ${!fine ? 'disabled-section' : ''}`}>
        <div className="step-title"><span>3</span><div><h3>Detalhes</h3><p>Confirma a data e o valor</p></div></div>
        {fine ? (
          <div className="detail-fields">
            {fine.amountType === 'per_minute' && (
              <label><span>Minutos</span><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label>
            )}
            {fine.amountType === 'variable' && (
              <label><span>Valor do almoço (€)</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={variableAmount || ''} onChange={(event) => setVariableAmount(Number(event.target.value))} placeholder="0,00" /></label>
            )}
            <label><span>Data</span><input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
            <label className="full-field"><span>Observação <small>(opcional)</small></span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Algum detalhe importante..." rows={3} /></label>
          </div>
        ) : <p className="section-hint">Escolhe primeiro o tipo de multa.</p>}
      </section>

      <div className="form-total">
        <div><span>Total a registar</span><strong>{formatMoney(total)}</strong></div>
        <button className="primary-button" disabled={!person || !fine || total <= 0} type="submit"><Check size={19} /> Confirmar multa</button>
      </div>
    </form>
  )
}

function CurrentMonth({ data, currentMonthKey, onDelete, onClose, setPage, isAdmin }: { data: AppData; currentMonthKey: string; onDelete: (id: string) => void; onClose: () => void; setPage: (page: Page) => void; isAdmin: boolean }) {
  const [filter, setFilter] = useState('')
  const month = data.months.find((candidate) => candidate.key === currentMonthKey)
  const entries = entriesForMonth(data, currentMonthKey)
  const totals = totalsByPerson(data, currentMonthKey)
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0)
  const visibleEntries = [...entries]
    .filter((entry) => !filter || entry.personId === filter)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt))
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1])

  const confirmClose = () => {
    if (window.confirm('Fechar este mês? Os valores ficam bloqueados e começa o prazo de 7 dias para pagamento.')) onClose()
  }

  return (
    <div className="stack-xl">
      <section className="month-summary">
        <div><p>{monthLabel(currentMonthKey)}</p><h2>{formatMoney(total)}</h2><span>{entries.length} movimentos · {totals.size} membros</span></div>
        <div className={`month-status ${month?.status}`}>{month?.status === 'open' ? 'Mês aberto' : 'Mês fechado'}</div>
      </section>
      {isAdmin && <div className="month-actions">
        <button className="primary-button" disabled={month?.status !== 'open'} onClick={() => setPage('add')}><Plus size={19} /> Nova multa</button>
        <button className="secondary-button danger-outline" disabled={month?.status !== 'open'} onClick={confirmClose}><LockKeyhole size={18} /> Fechar mês</button>
      </div>}
      <section className="content-grid month-grid">
        <div className="card">
          <CardHeader title="Totais por membro" />
          <div className="ranking-list">
            {ranked.map(([personId, amount], index) => {
              const person = data.people.find((item) => item.id === personId)
              return (
                <button key={personId} className={filter === personId ? 'active' : ''} onClick={() => setFilter(filter === personId ? '' : personId)}>
                  <span className="rank">{index + 1}</span><span className="avatar">{initials(person?.name ?? '')}</span>
                  <span className="rank-name">{person?.name}</span><strong>{formatMoney(amount)}</strong>
                </button>
              )
            })}
          </div>
        </div>
        <div className="card entries-card">
          <div className="card-header">
            <div><h3>Movimentos</h3>{filter && <button className="clear-filter" onClick={() => setFilter('')}><X size={14} /> Limpar filtro</button>}</div>
            <span className="count-badge">{visibleEntries.length}</span>
          </div>
          {visibleEntries.length ? <div className="activity-list detailed">
            {visibleEntries.map((entry) => <EntryRow key={entry.id} entry={entry} data={data} onDelete={isAdmin && month?.status === 'open' && entry.source === 'manual' ? () => {
              if (window.confirm('Remover este registo?')) onDelete(entry.id)
            } : undefined} />)}
          </div> : <EmptyState icon={ReceiptText} title="Sem movimentos" text="Não existem registos com este filtro." />}
        </div>
      </section>
    </div>
  )
}

function Payments({ data, onPayment, isAdmin }: { data: AppData; onPayment: (monthKey: string, personId: string, paid: boolean) => void; isAdmin: boolean }) {
  const closedMonths = [...data.months].filter((month) => month.status === 'closed').sort((a, b) => b.key.localeCompare(a.key))
  const [selectedKey, setSelectedKey] = useState(closedMonths[0]?.key ?? '')
  const month = closedMonths.find((candidate) => candidate.key === selectedKey) ?? closedMonths[0]

  if (!month) return <EmptyState icon={WalletCards} title="Ainda não há pagamentos" text="Os pagamentos aparecem aqui depois de fechares o primeiro mês." />

  const now = new Date()
  const deadline = new Date(month.deadline!)
  const expired = deadline < now
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000))
  const paidTotal = month.settlements.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.finalAmount, 0)
  const pendingTotal = month.settlements.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.finalAmount, 0)

  return (
    <div className="stack-xl">
      <div className="toolbar-row">
        <label className="select-label"><span>Mês</span><select value={month.key} onChange={(event) => setSelectedKey(event.target.value)}>{closedMonths.map((item) => <option value={item.key} key={item.key}>{monthLabel(item.key)}</option>)}</select></label>
        <div className={`deadline-banner ${expired ? 'expired' : ''}`}>
          <Clock3 size={20} />
          <div><strong>{expired ? 'Prazo terminado' : `${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}`}</strong><span>Limite: {formatDate(month.deadline, true)}</span></div>
        </div>
      </div>
      <section className="stats-grid payment-stats">
        <StatCard icon={BadgeEuro} label="Total fechado" value={formatMoney(month.settlements.reduce((sum, item) => sum + item.baseAmount, 0))} detail={`${month.settlements.length} membros`} />
        <StatCard icon={CheckCircle2} label="Recebido" value={formatMoney(paidTotal)} detail={`${month.settlements.filter((item) => item.status === 'paid').length} pagamentos`} />
        <StatCard icon={CircleAlert} label="Em dívida" value={formatMoney(pendingTotal)} detail={expired ? 'inclui valores duplicados' : 'a aguardar pagamento'} danger={pendingTotal > 0} />
      </section>
      <section className="card payment-card">
        <CardHeader title="Estado dos pagamentos" />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Membro</th><th>Original</th><th>Penalização</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {[...month.settlements].sort((a, b) => {
                if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
                return (data.people.find((p) => p.id === a.personId)?.name ?? '').localeCompare(data.people.find((p) => p.id === b.personId)?.name ?? '')
              }).map((settlement) => {
                const person = data.people.find((item) => item.id === settlement.personId)
                return <tr key={settlement.personId}>
                  <td><div className="person-cell"><span className="avatar">{initials(person?.name ?? '')}</span><span><strong>{person?.name}</strong><small>{person?.role === 'staff' ? 'Equipa técnica' : 'Jogador'}</small></span></div></td>
                  <td>{formatMoney(settlement.baseAmount)}</td>
                  <td className={settlement.penaltyAmount ? 'penalty' : ''}>{settlement.penaltyAmount ? `+ ${formatMoney(settlement.penaltyAmount)}` : '—'}</td>
                  <td><strong>{formatMoney(settlement.finalAmount)}</strong></td>
                  <td><span className={`payment-status ${settlement.status} ${settlement.penaltyAmount ? 'overdue' : ''}`}>{settlement.status === 'paid' ? 'Pago' : settlement.penaltyAmount ? 'Em atraso' : 'Pendente'}</span></td>
                  <td>{isAdmin && <button className={settlement.status === 'paid' ? 'small-button muted' : 'small-button success'} onClick={() => onPayment(month.key, settlement.personId, settlement.status !== 'paid')}>{settlement.status === 'paid' ? 'Anular' : 'Marcar pago'}</button>}</td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function HistoryPage({ data }: { data: AppData }) {
  const months = [...data.months].filter((month) => month.status === 'closed').sort((a, b) => b.key.localeCompare(a.key))
  const [expanded, setExpanded] = useState<string | null>(months[0]?.key ?? null)

  if (!months.length) return <EmptyState icon={History} title="Histórico vazio" text="Quando fechares um mês, o respetivo resumo fica guardado aqui." />

  return (
    <div className="stack-xl">
      <section className="card history-table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Mês</th><th>Original</th><th>Penalizações</th><th>Total final</th><th>Recebido</th><th>Em dívida</th><th></th></tr></thead>
            <tbody>{months.map((month) => {
              const original = month.settlements.reduce((sum, item) => sum + item.baseAmount, 0)
              const penalties = month.settlements.reduce((sum, item) => sum + item.penaltyAmount, 0)
              const final = month.settlements.reduce((sum, item) => sum + item.finalAmount, 0)
              const paid = month.settlements.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.finalAmount, 0)
              return <tr key={month.key}>
                <td><strong className="capitalize">{monthLabel(month.key)}</strong><small className="table-subtitle">Fechado a {formatDate(month.closedAt)}</small></td>
                <td>{formatMoney(original)}</td><td className={penalties ? 'penalty' : ''}>{formatMoney(penalties)}</td><td><strong>{formatMoney(final)}</strong></td><td>{formatMoney(paid)}</td><td>{formatMoney(final - paid)}</td>
                <td><button className="icon-button" aria-label="Ver detalhe" onClick={() => setExpanded(expanded === month.key ? null : month.key)}><ChevronRight className={expanded === month.key ? 'rotate' : ''} size={19} /></button></td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </section>
      {expanded && <HistoryDetail data={data} monthKey={expanded} />}
    </div>
  )
}

function HistoryDetail({ data, monthKey }: { data: AppData; monthKey: string }) {
  const month = data.months.find((item) => item.key === monthKey)!
  return (
    <section className="card">
      <CardHeader title={`Detalhe de ${monthLabel(monthKey)}`} />
      <div className="history-detail-grid">
        {month.settlements.map((item) => {
          const person = data.people.find((candidate) => candidate.id === item.personId)
          return <div className="history-person" key={item.personId}>
            <span className="avatar">{initials(person?.name ?? '')}</span>
            <div><strong>{person?.name}</strong><small>{item.status === 'paid' ? `Pago a ${formatDate(item.paidAt)}` : 'Por pagar'}</small></div>
            <span>{formatMoney(item.finalAmount)}</span>
          </div>
        })}
      </div>
    </section>
  )
}

function SettingsPage({ data, onRename, onActive, onAddPerson, onFinePrice, onCloseSeason, onStartSeason, onLogout }: {
  data: AppData
  onRename: (personId: string, name: string) => void
  onActive: (personId: string) => void
  onAddPerson: (name: string, role: PersonRole) => void
  onFinePrice: (fineId: string, amount: number) => void
  onCloseSeason: () => void
  onStartSeason: (label: string) => void
  onLogout: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<PersonRole>('player')
  const season = data.seasons.find((item) => item.id === data.currentSeasonId)
  const [newSeasonLabel, setNewSeasonLabel] = useState(() => nextSeasonLabel(season?.label ?? '2026/2027'))

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `multas-cruzeiro-${todayInputValue()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="settings-layout">
      <section className="card settings-card">
        <div className="settings-heading"><span className="settings-icon"><CalendarDays size={22} /></span><div><h3>Época e pagamentos obrigatórios</h3><p>Gestão da época {season?.label}</p></div></div>
        <div className="mandatory-grid"><div><span>Abertura de caixa</span><strong>1,00 €</strong><small>{season?.openingApplied ? 'Aplicada' : 'Por aplicar'}</small></div><div><span>Mensalidade</span><strong>0,50 €</strong><small>No início de cada mês</small></div><div><span>Fecho de caixa</span><strong>1,00 €</strong><small>{season?.closingApplied ? 'Aplicado' : 'No fim da época'}</small></div></div>
        {season?.status === 'open' ? <button className="secondary-button danger-outline" onClick={() => {
          if (window.confirm('Aplicar 1,00 € de fecho de caixa a todos os membros ativos?')) onCloseSeason()
        }}><LockKeyhole size={18} /> Encerrar época e aplicar fecho</button> : <form className="new-season-form" onSubmit={(event) => { event.preventDefault(); if (newSeasonLabel.trim()) onStartSeason(newSeasonLabel) }}>
          <label><span>Nova época</span><input value={newSeasonLabel} onChange={(event) => setNewSeasonLabel(event.target.value)} placeholder="2027/2028" /></label>
          <button className="primary-button" type="submit"><Plus size={18} /> Iniciar época</button>
        </form>}
      </section>

      <details className="card settings-details" open>
        <summary><div className="settings-heading"><span className="settings-icon"><UsersRound size={22} /></span><div><h3>Membros</h3><p>{data.people.filter((person) => person.active).length} ativos</p></div></div><ChevronRight size={20} /></summary>
        <div className="settings-body">
          <form className="add-person" onSubmit={(event) => { event.preventDefault(); if (!newName.trim()) return; onAddPerson(newName, newRole); setNewName('') }}>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nome do novo membro" />
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as PersonRole)}><option value="player">Jogador</option><option value="staff">Equipa técnica</option></select>
            <button className="primary-button" type="submit"><Plus size={18} /> Adicionar</button>
          </form>
          {(['player', 'staff'] as PersonRole[]).map((role) => <div key={role} className="member-group"><h4>{role === 'player' ? 'Jogadores' : 'Equipa técnica'}</h4><div className="member-list">{data.people.filter((person) => person.role === role).map((person) => <MemberEditor key={person.id} person={person} onRename={onRename} onActive={onActive} />)}</div></div>)}
        </div>
      </details>

      <details className="card settings-details">
        <summary><div className="settings-heading"><span className="settings-icon"><ReceiptText size={22} /></span><div><h3>Regulamento de multas</h3><p>{data.fineTypes.filter((fine) => !fine.automatic).length} tipos configurados</p></div></div><ChevronRight size={20} /></summary>
        <div className="settings-body fine-settings-list">
          {data.fineTypes.filter((fine) => !fine.automatic).map((fine) => <FinePriceEditor key={fine.id} fine={fine} onFinePrice={onFinePrice} />)}
        </div>
      </details>

      <section className="card settings-card">
        <div className="settings-heading"><span className="settings-icon"><ShieldCheck size={22} /></span><div><h3>Dados e segurança</h3><p>Os dados estão guardados neste dispositivo</p></div></div>
        <div className="notice"><CircleAlert size={20} /><p>Faz uma cópia de segurança regularmente. A sincronização entre dispositivos e o login de administrador serão ligados quando existir uma base de dados online.</p></div>
        <button className="secondary-button" onClick={exportData}><Download size={18} /> Exportar cópia de segurança</button>
        <button className="secondary-button logout-button" onClick={onLogout}><LogOut size={18} /> Terminar sessão de administrador</button>
      </section>
    </div>
  )
}

function MemberEditor({ person, onRename, onActive }: { person: Person; onRename: (id: string, name: string) => void; onActive: (id: string) => void }) {
  const [name, setName] = useState(person.name)
  return <div className={`member-editor ${!person.active ? 'inactive' : ''}`}><span className="avatar">{initials(person.name)}</span><input value={name} onChange={(event) => setName(event.target.value)} onBlur={() => onRename(person.id, name)} /><button className={`toggle ${person.active ? 'on' : ''}`} aria-label={person.active ? 'Desativar membro' : 'Ativar membro'} onClick={() => onActive(person.id)}><span /></button></div>
}

function FinePriceEditor({ fine, onFinePrice }: { fine: FineType; onFinePrice: (id: string, amount: number) => void }) {
  const [amount, setAmount] = useState(fine.unitAmount ?? 0)
  return <div className="fine-price-editor"><span className="fine-code">{fine.code}</span><div><strong>{fine.name}</strong><small>{fine.amountType === 'variable' ? 'Valor definido no registo' : fine.amountType === 'per_minute' ? 'Preço por minuto' : 'Valor fixo'}</small></div>{fine.amountType === 'variable' ? <span className="variable-label">Editável</span> : <label><Euro size={15} /><input type="number" min="0" step="0.1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} onBlur={() => onFinePrice(fine.id, amount)} /></label>}</div>
}

function LoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!password) return
    setSubmitting(true)
    setError('')
    try {
      await onLogin(password)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível iniciar sessão.')
      setSubmitting(false)
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <button className="modal-close" aria-label="Fechar" onClick={onClose}><X size={20} /></button>
      <span className="login-icon"><LockKeyhole size={26} /></span>
      <p className="eyebrow">Área reservada</p>
      <h2 id="login-title">Entrar como administrador</h2>
      <p>Apenas o administrador pode registar multas e alterar pagamentos.</p>
      <form onSubmit={submit}>
        <label><span>Palavra-passe</span><input type="password" autoFocus autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Introduz a palavra-passe" /></label>
        {error && <div className="login-error"><CircleAlert size={16} /> {error}</div>}
        <button className="primary-button" disabled={submitting || !password} type="submit">{submitting ? 'A entrar…' : 'Entrar'}</button>
      </form>
    </div>
  </div>
}

function EntryRow({ entry, data, onDelete }: { entry: FineEntry; data: AppData; onDelete?: () => void }) {
  const person = data.people.find((item) => item.id === entry.personId)
  const fine = data.fineTypes.find((item) => item.id === entry.fineTypeId)
  return (
    <div className="entry-row">
      <span className={`entry-icon ${entry.source}`}><ReceiptText size={18} /></span>
      <div className="entry-main"><strong>{person?.name}</strong><span><b>{fine?.code}</b> · {fine?.name}</span><small>{formatOccurredDate(entry.occurredOn)}{entry.quantity > 1 ? ` · ${entry.quantity} min` : ''}{entry.note ? ` · ${entry.note}` : ''}</small></div>
      <strong className="entry-amount">{formatMoney(entry.total)}</strong>
      {onDelete && <button className="delete-button" aria-label="Apagar registo" onClick={onDelete}><Trash2 size={17} /></button>}
    </div>
  )
}

function CardHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="card-header"><h3>{title}</h3>{action && <button onClick={onAction}>{action} <ChevronRight size={16} /></button>}</div>
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) {
  return <div className="empty-state"><Icon size={30} /><h3>{title}</h3><p>{text}</p></div>
}

function finePriceLabel(fine: FineType) {
  if (fine.amountType === 'variable') return 'Valor editável'
  return `${formatMoney(fine.unitAmount ?? 0)}${fine.amountType === 'per_minute' ? ' / minuto' : ''}`
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function formatOccurredDate(date: string) {
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`))
}

function nextSeasonLabel(label: string) {
  const years = label.split('/').map(Number)
  if (years.length !== 2 || years.some(Number.isNaN)) return ''
  return `${years[0] + 1}/${years[1] + 1}`
}

export default App

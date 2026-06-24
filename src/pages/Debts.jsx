import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, TrendingDown, Calculator, Target, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal, ConfirmDialog, Spinner, EmptyState, PageHeader, fmtCurrency } from '../components/UI'

/* ─── Hook ─────────────────────────────────────────────────────────────── */
function useDebts() {
  const { user } = useAuth()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('debts').select('*').eq('user_id', user.id).order('created_at')
    setDebts(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase.from('debts').insert({ ...payload, user_id: user.id }).select().single()
    if (!error) setDebts(p => [...p, data])
    return { data, error }
  }
  const update = async (id, payload) => {
    const { data, error } = await supabase.from('debts').update(payload).eq('id', id).eq('user_id', user.id).select().single()
    if (!error) setDebts(p => p.map(d => d.id === id ? data : d))
    return { data, error }
  }
  const remove = async (id) => {
    const { error } = await supabase.from('debts').delete().eq('id', id).eq('user_id', user.id)
    if (!error) setDebts(p => p.filter(d => d.id !== id))
    return { error }
  }
  return { debts, loading, create, update, remove, refetch: fetch }
}

/* ─── Simulador ──────────────────────────────────────────────────────────── */
function calcSimulation(principal, monthlyRate, monthlyPayment) {
  if (!principal || !monthlyPayment) return null
  const rate = monthlyRate / 100
  if (monthlyPayment <= principal * rate && rate > 0) return null // pagamento menor que os juros
  let balance = principal
  let months = 0
  let totalPaid = 0
  while (balance > 0.01 && months < 600) {
    const interest = balance * rate
    const principal_paid = Math.min(monthlyPayment - interest, balance)
    balance -= principal_paid
    totalPaid += monthlyPayment
    months++
    if (balance < 0) { totalPaid += balance; balance = 0 }
  }
  return { months, totalPaid, totalInterest: totalPaid - principal }
}

/* ─── Debt Form ──────────────────────────────────────────────────────────── */
function DebtForm({ isOpen, onClose, onSave, initial }) {
  const blank = { name: '', creditor: '', total_amount: '', paid_amount: '0', interest_rate: '0', monthly_payment: '', due_date: '', status: 'ativo', notes: '' }
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sim, setSim] = useState(null)

  useEffect(() => {
    if (isOpen) {
      setForm(initial ? { ...blank, ...initial, total_amount: String(initial.total_amount), paid_amount: String(initial.paid_amount || 0), interest_rate: String(initial.interest_rate || 0), monthly_payment: String(initial.monthly_payment || '') } : blank)
      setErrors({})
      setSim(null)
    }
  }, [isOpen, initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const runSim = () => {
    const remaining = parseFloat(form.total_amount) - parseFloat(form.paid_amount || 0)
    const result = calcSimulation(remaining, parseFloat(form.interest_rate || 0), parseFloat(form.monthly_payment))
    setSim(result)
  }

  const handleSave = async () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Informe o nome'
    if (!form.total_amount || isNaN(form.total_amount) || Number(form.total_amount) <= 0) e.total_amount = 'Valor inválido'
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    await onSave({
      ...form,
      total_amount: parseFloat(form.total_amount),
      paid_amount: parseFloat(form.paid_amount || 0),
      interest_rate: parseFloat(form.interest_rate || 0),
      monthly_payment: parseFloat(form.monthly_payment || 0),
    })
    setLoading(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar Dívida' : 'Nova Dívida'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Salvar'}
        </button>
      </>}>

      <div className="form-grid form-grid-2">
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Nome da dívida <span>*</span></label>
          <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Ex: Cartão Nubank, Empréstimo..." value={form.name} onChange={e => set('name', e.target.value)} />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Credor</label>
          <input className="form-input" placeholder="Banco, loja..." value={form.creditor} onChange={e => set('creditor', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="ativo">🔴 Em aberto</option>
            <option value="negociando">🟡 Negociando</option>
            <option value="quitado">🟢 Quitado</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Valor total <span>*</span></label>
          <input className={`form-input ${errors.total_amount ? 'error' : ''}`} type="number" step="0.01" placeholder="0,00" value={form.total_amount} onChange={e => set('total_amount', e.target.value)} />
          {errors.total_amount && <span className="form-error">{errors.total_amount}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Valor já pago</label>
          <input className="form-input" type="number" step="0.01" placeholder="0,00" value={form.paid_amount} onChange={e => set('paid_amount', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Juros ao mês (%)</label>
          <input className="form-input" type="number" step="0.01" placeholder="0,00" value={form.interest_rate} onChange={e => set('interest_rate', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Pagamento mensal</label>
          <input className="form-input" type="number" step="0.01" placeholder="0,00" value={form.monthly_payment} onChange={e => set('monthly_payment', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Vencimento</label>
          <input className="form-input" type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Observações</label>
          <textarea className="form-textarea" rows={2} placeholder="Notas..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>

      {/* Mini simulador dentro do form */}
      {form.total_amount && form.monthly_payment && (
        <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: 14, marginTop: 4 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={runSim} style={{ marginBottom: sim ? 10 : 0 }}>
            <Calculator size={14} /> Simular quitação
          </button>
          {sim && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 8 }}>
              {[
                { label: 'Meses', value: `${sim.months}x` },
                { label: 'Total pago', value: fmtCurrency(sim.totalPaid) },
                { label: 'Juros totais', value: fmtCurrency(sim.totalInterest) },
              ].map(i => (
                <div key={i.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{i.label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{i.value}</div>
                </div>
              ))}
            </div>
          )}
          {sim === null && form.monthly_payment && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 6 }}>⚠ Pagamento insuficiente para cobrir os juros</p>}
        </div>
      )}
    </Modal>
  )
}

/* ─── Debt Card ──────────────────────────────────────────────────────────── */
function DebtCard({ debt, onEdit, onDelete, onPay }) {
  const [expanded, setExpanded] = useState(false)
  const remaining = debt.total_amount - (debt.paid_amount || 0)
  const progress = Math.min(((debt.paid_amount || 0) / debt.total_amount) * 100, 100)
  const sim = calcSimulation(remaining, debt.interest_rate || 0, debt.monthly_payment || 0)

  const statusColor = { ativo: 'var(--danger)', negociando: 'var(--warning)', quitado: 'var(--success)' }
  const statusLabel = { ativo: '🔴 Em aberto', negociando: '🟡 Negociando', quitado: '🟢 Quitado' }

  return (
    <div className="card" style={{ borderLeft: `3px solid ${statusColor[debt.status]}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{debt.name}</span>
            <span className={`badge ${debt.status === 'quitado' ? 'badge-success' : debt.status === 'negociando' ? 'badge-warning' : 'badge-danger'}`}>
              {statusLabel[debt.status]}
            </span>
          </div>
          {debt.creditor && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{debt.creditor}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: statusColor[debt.status] }}>{fmtCurrency(remaining)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>de {fmtCurrency(debt.total_amount)}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
          <span>Progresso de quitação</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{progress.toFixed(0)}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--primary-light))', borderRadius: 999, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Quick info */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {debt.interest_rate > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📈 {debt.interest_rate}% a.m.</span>}
        {debt.monthly_payment > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>💸 {fmtCurrency(debt.monthly_payment)}/mês</span>}
        {sim && <span style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>⏱ Quita em {sim.months} meses</span>}
        {debt.due_date && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 Vence {new Date(debt.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
      </div>

      {/* Expandable details */}
      {expanded && sim && (
        <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
            {[
              { label: 'Parcelas restantes', value: `${sim.months}x` },
              { label: 'Total a pagar', value: fmtCurrency(sim.totalPaid) },
              { label: 'Total em juros', value: fmtCurrency(sim.totalInterest) },
            ].map(i => (
              <div key={i.label}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{i.label}</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{i.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {debt.status !== 'quitado' && (
          <button className="btn btn-secondary btn-sm" onClick={() => onPay(debt)} style={{ gap: 6 }}>
            <CheckCircle2 size={14} /> Registrar pagamento
          </button>
        )}
        {sim && (
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(v => !v)} style={{ gap: 4 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Simulação
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(debt)}><Pencil size={13} /></button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(debt.id)}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

/* ─── Pay Modal ──────────────────────────────────────────────────────────── */
function PayModal({ debt, isOpen, onClose, onConfirm }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && debt) setAmount(String(debt.monthly_payment || ''))
  }, [isOpen, debt])

  const handle = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return
    setLoading(true)
    await onConfirm(Number(amount))
    setLoading(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pagamento"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handle} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Confirmar'}
        </button>
      </>}>
      <p style={{ fontSize: '0.875rem' }}>Quanto você pagou de <strong>{debt?.name}</strong>?</p>
      <div className="form-group">
        <label className="form-label">Valor pago</label>
        <input className="form-input" type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </div>
    </Modal>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function Debts() {
  const { debts, loading, create, update, remove } = useDebts()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [payDebt, setPayDebt] = useState(null)
  const [strategy, setStrategy] = useState('snowball') // snowball | avalanche

  const handleSave = async (payload) => {
    if (editItem) {
      const { error } = await update(editItem.id, payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Dívida atualizada!')
    } else {
      const { error } = await create(payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Dívida cadastrada!')
    }
    setEditItem(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await remove(deleteId)
    if (error) toast.error('Erro ao excluir')
    else toast.success('Dívida removida!')
    setDeleteId(null)
    setDeleting(false)
  }

  const handlePay = async (amount) => {
    const newPaid = (payDebt.paid_amount || 0) + amount
    const newStatus = newPaid >= payDebt.total_amount ? 'quitado' : payDebt.status
    const { error } = await update(payDebt.id, { paid_amount: newPaid, status: newStatus })
    if (error) toast.error('Erro ao registrar')
    else toast.success(newStatus === 'quitado' ? '🎉 Dívida quitada!' : 'Pagamento registrado!')
  }

  const active = debts.filter(d => d.status !== 'quitado')
  const totalDebt = active.reduce((s, d) => s + (d.total_amount - (d.paid_amount || 0)), 0)
  const totalOriginal = active.reduce((s, d) => s + d.total_amount, 0)
  const quitadas = debts.filter(d => d.status === 'quitado').length

  // Estratégias de quitação
  const sortedDebts = strategy === 'snowball'
    ? [...active].sort((a, b) => (a.total_amount - (a.paid_amount||0)) - (b.total_amount - (b.paid_amount||0)))
    : [...active].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0))

  return (
    <div className="page-container">
      <PageHeader title="Dívidas" subtitle="Controle e simule a quitação das suas dívidas"
        action={<button className="btn btn-primary" onClick={() => { setEditItem(null); setAddOpen(true) }}><Plus size={18} /><span className="hide-sm">Nova</span></button>}
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total em dívidas', value: fmtCurrency(totalDebt), color: 'var(--danger)', bg: 'var(--danger-bg)' },
          { label: 'Dívidas ativas', value: active.length, color: 'var(--warning)', bg: 'var(--warning-bg)', suffix: '' },
          { label: 'Já quitadas', value: quitadas, color: 'var(--success)', bg: 'var(--success-bg)', suffix: '' },
          { label: 'Total original', value: fmtCurrency(totalOriginal), color: 'var(--text-secondary)', bg: 'var(--bg-hover)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {active.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>Estratégia de quitação</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {strategy === 'snowball' ? '⛄ Bola de neve: quite as menores primeiro para ganhar motivação' : '🔥 Avalanche: quite as de maior juros primeiro para pagar menos'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button className={`filter-chip ${strategy === 'snowball' ? 'active' : ''}`} onClick={() => setStrategy('snowball')}>⛄ Bola de neve</button>
              <button className={`filter-chip ${strategy === 'avalanche' ? 'active' : ''}`} onClick={() => setStrategy('avalanche')}>🔥 Avalanche</button>
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedDebts.slice(0, 3).map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8rem' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : 'var(--bg-hover)', color: i === 0 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>{i + 1}º</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: i === 0 ? 600 : 400 }}>{d.name}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{fmtCurrency(d.total_amount - (d.paid_amount || 0))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 ? (
        <EmptyState icon={TrendingDown} title="Nenhuma dívida cadastrada"
          message="Cadastre suas dívidas para acompanhar e planejar a quitação."
          action={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Adicionar dívida</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.length > 0 && <>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Em aberto</h3>
            {sortedDebts.map(d => (
              <DebtCard key={d.id} debt={d} onEdit={setEditItem} onDelete={setDeleteId} onPay={setPayDebt} />
            ))}
          </>}
          {debts.filter(d => d.status === 'quitado').length > 0 && <>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>Quitadas 🎉</h3>
            {debts.filter(d => d.status === 'quitado').map(d => (
              <DebtCard key={d.id} debt={d} onEdit={setEditItem} onDelete={setDeleteId} onPay={setPayDebt} />
            ))}
          </>}
        </div>
      )}

      <DebtForm isOpen={addOpen || !!editItem} onClose={() => { setAddOpen(false); setEditItem(null) }} onSave={handleSave} initial={editItem} />
      <PayModal debt={payDebt} isOpen={!!payDebt} onClose={() => setPayDebt(null)} onConfirm={handlePay} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Excluir dívida" message="Deseja remover esta dívida permanentemente?" />
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Target, TrendingUp, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal, ConfirmDialog, Spinner, EmptyState, PageHeader, fmtCurrency } from '../components/UI'

const GOAL_ICONS = ['🏠', '🚗', '✈️', '📱', '💍', '🎓', '💰', '🏖️', '🏋️', '🎮', '💻', '🐾']
const COLORS = ['#6C47FF', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6', '#F97316']

function useGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).order('created_at')
    setGoals(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const create = async (p) => {
    const { data, error } = await supabase.from('goals').insert({ ...p, user_id: user.id }).select().single()
    if (!error) setGoals(prev => [...prev, data])
    return { data, error }
  }
  const update = async (id, p) => {
    const { data, error } = await supabase.from('goals').update(p).eq('id', id).eq('user_id', user.id).select().single()
    if (!error) setGoals(prev => prev.map(g => g.id === id ? data : g))
    return { data, error }
  }
  const remove = async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', user.id)
    if (!error) setGoals(prev => prev.filter(g => g.id !== id))
    return { error }
  }
  return { goals, loading, create, update, remove }
}

function GoalForm({ isOpen, onClose, onSave, initial }) {
  const blank = { name: '', icon: '💰', color: '#6C47FF', target_amount: '', saved_amount: '0', monthly_contribution: '', deadline: '', notes: '' }
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) setForm(initial ? { ...blank, ...initial, target_amount: String(initial.target_amount), saved_amount: String(initial.saved_amount || 0), monthly_contribution: String(initial.monthly_contribution || '') } : blank)
  }, [isOpen, initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  // Calc months to reach goal
  const remaining = (parseFloat(form.target_amount) || 0) - (parseFloat(form.saved_amount) || 0)
  const monthly = parseFloat(form.monthly_contribution) || 0
  const monthsNeeded = monthly > 0 ? Math.ceil(remaining / monthly) : null

  const handleSave = async () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Informe o nome da meta'
    if (!form.target_amount || isNaN(form.target_amount) || Number(form.target_amount) <= 0) e.target_amount = 'Valor inválido'
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    await onSave({
      ...form,
      target_amount: parseFloat(form.target_amount),
      saved_amount: parseFloat(form.saved_amount || 0),
      monthly_contribution: parseFloat(form.monthly_contribution || 0),
    })
    setLoading(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar Meta' : 'Nova Meta'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Salvar'}
        </button>
      </>}>

      {/* Icon picker */}
      <div className="form-group">
        <label className="form-label">Ícone</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GOAL_ICONS.map(ic => (
            <button key={ic} type="button" onClick={() => set('icon', ic)}
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', fontSize: '1.2rem', border: form.icon === ic ? '2px solid var(--primary)' : '1px solid var(--border-subtle)', background: form.icon === ic ? 'var(--primary-glow)' : 'var(--bg-input)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nome da meta <span>*</span></label>
        <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="Ex: Viagem para Europa, Carro novo..." value={form.name} onChange={e => set('name', e.target.value)} />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Cor</label>
        <div className="color-grid">
          {COLORS.map(c => (
            <div key={c} className={`color-dot ${form.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => set('color', c)} />
          ))}
        </div>
      </div>

      <div className="form-grid form-grid-2">
        <div className="form-group">
          <label className="form-label">Valor da meta <span>*</span></label>
          <input className={`form-input ${errors.target_amount ? 'error' : ''}`} type="number" step="0.01" placeholder="0,00" value={form.target_amount} onChange={e => set('target_amount', e.target.value)} />
          {errors.target_amount && <span className="form-error">{errors.target_amount}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Já guardado</label>
          <input className="form-input" type="number" step="0.01" placeholder="0,00" value={form.saved_amount} onChange={e => set('saved_amount', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Contribuição mensal</label>
          <input className="form-input" type="number" step="0.01" placeholder="0,00" value={form.monthly_contribution} onChange={e => set('monthly_contribution', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Prazo desejado</label>
          <input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
      </div>

      {monthsNeeded && remaining > 0 && (
        <div style={{ background: 'var(--primary-glow)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Previsão de conclusão</div>
          <div style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
            {monthsNeeded <= 12 ? `${monthsNeeded} meses` : `${Math.floor(monthsNeeded/12)} ano${Math.floor(monthsNeeded/12) > 1 ? 's' : ''} e ${monthsNeeded % 12} meses`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Faltam {fmtCurrency(remaining)} • Guardando {fmtCurrency(monthly)}/mês
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Observações</label>
        <textarea className="form-textarea" rows={2} placeholder="Detalhes da meta..." value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
    </Modal>
  )
}

function DepositModal({ goal, isOpen, onClose, onConfirm }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) return
    setLoading(true)
    await onConfirm(Number(amount))
    setLoading(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar ao objetivo"
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handle} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Confirmar'}
        </button>
      </>}>
      <p style={{ fontSize: '0.875rem' }}>Quanto você guardou para <strong>{goal?.name}</strong>?</p>
      <div className="form-group">
        <label className="form-label">Valor</label>
        <input className="form-input" type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </div>
    </Modal>
  )
}

function GoalCard({ goal, onEdit, onDelete, onDeposit }) {
  const progress = Math.min(((goal.saved_amount || 0) / goal.target_amount) * 100, 100)
  const remaining = goal.target_amount - (goal.saved_amount || 0)
  const done = progress >= 100

  const monthsNeeded = goal.monthly_contribution > 0 && remaining > 0
    ? Math.ceil(remaining / goal.monthly_contribution)
    : null

  return (
    <div className="card" style={{ borderTop: `3px solid ${goal.color || 'var(--primary)'}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: `${goal.color}22`, border: `1px solid ${goal.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
            {goal.icon || '💰'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{goal.name}</div>
            {done
              ? <span className="badge badge-success" style={{ marginTop: 4 }}>🎉 Concluída!</span>
              : <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {monthsNeeded ? `⏱ ~${monthsNeeded} meses para concluir` : 'Defina uma contribuição mensal'}
                </div>
            }
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: goal.color || 'var(--primary)' }}>{fmtCurrency(goal.saved_amount || 0)}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>de {fmtCurrency(goal.target_amount)}</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Progresso</span>
          <span style={{ fontWeight: 700, color: goal.color || 'var(--primary)' }}>{progress.toFixed(1)}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--bg-hover)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: done ? 'var(--success)' : `linear-gradient(90deg, ${goal.color || 'var(--primary)'}, ${goal.color || 'var(--primary)'}99)`, borderRadius: 999, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {!done && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>💸 Falta {fmtCurrency(remaining)}</span>}
        {goal.monthly_contribution > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {fmtCurrency(goal.monthly_contribution)}/mês</span>}
        {goal.deadline && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🎯 Prazo: {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {!done && (
          <button className="btn btn-secondary btn-sm" onClick={() => onDeposit(goal)} style={{ gap: 6 }}>
            <DollarSign size={14} /> Adicionar valor
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(goal)}><Pencil size={13} /></button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(goal.id)}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

export default function Goals() {
  const { goals, loading, create, update, remove } = useGoals()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [depositGoal, setDepositGoal] = useState(null)

  const handleSave = async (payload) => {
    if (editItem) {
      const { error } = await update(editItem.id, payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Meta atualizada!')
    } else {
      const { error } = await create(payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Meta criada!')
    }
    setEditItem(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await remove(deleteId)
    if (error) toast.error('Erro ao excluir')
    else toast.success('Meta removida!')
    setDeleteId(null)
    setDeleting(false)
  }

  const handleDeposit = async (amount) => {
    const newSaved = (depositGoal.saved_amount || 0) + amount
    const { error } = await update(depositGoal.id, { saved_amount: newSaved })
    if (error) toast.error('Erro ao registrar')
    else if (newSaved >= depositGoal.target_amount) toast.success('🎉 Meta concluída! Parabéns!')
    else toast.success('Valor adicionado à meta!')
  }

  const active = goals.filter(g => (g.saved_amount || 0) < g.target_amount)
  const done = goals.filter(g => (g.saved_amount || 0) >= g.target_amount)
  const totalTarget = active.reduce((s, g) => s + g.target_amount, 0)
  const totalSaved = active.reduce((s, g) => s + (g.saved_amount || 0), 0)

  return (
    <div className="page-container">
      <PageHeader title="Metas Financeiras" subtitle="Defina objetivos e acompanhe o progresso"
        action={<button className="btn btn-primary" onClick={() => { setEditItem(null); setAddOpen(true) }}><Plus size={18} /><span className="hide-sm">Nova meta</span></button>}
      />

      {goals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Metas ativas', value: active.length, color: 'var(--primary)', },
            { label: 'Total necessário', value: fmtCurrency(totalTarget), color: 'var(--warning)' },
            { label: 'Total guardado', value: fmtCurrency(totalSaved), color: 'var(--success)' },
            { label: 'Concluídas', value: done.length, color: 'var(--success)' },
          ].map(c => (
            <div key={c.label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState icon={Target} title="Nenhuma meta criada"
          message="Crie metas financeiras para planejar conquistas como viagens, carro, reserva de emergência e mais."
          action={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Criar meta</button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.length > 0 && <>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Em andamento</h3>
            {active.map(g => <GoalCard key={g.id} goal={g} onEdit={setEditItem} onDelete={setDeleteId} onDeposit={setDepositGoal} />)}
          </>}
          {done.length > 0 && <>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>Concluídas 🎉</h3>
            {done.map(g => <GoalCard key={g.id} goal={g} onEdit={setEditItem} onDelete={setDeleteId} onDeposit={setDepositGoal} />)}
          </>}
        </div>
      )}

      <GoalForm isOpen={addOpen || !!editItem} onClose={() => { setAddOpen(false); setEditItem(null) }} onSave={handleSave} initial={editItem} />
      <DepositModal goal={depositGoal} isOpen={!!depositGoal} onClose={() => setDepositGoal(null)} onConfirm={handleDeposit} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} loading={deleting} title="Excluir meta" message="Deseja remover esta meta permanentemente?" />
    </div>
  )
}

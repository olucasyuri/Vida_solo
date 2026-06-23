import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle2, Clock, Play, Info } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useCategories } from '../hooks/useFinance'
import { Modal, ConfirmDialog, Spinner, EmptyState, PageHeader, fmtCurrency, StatusBadge } from '../components/UI'
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/* ─── Hook ────────────────────────────────────────────────────────────────── */
function useRecurring() {
  const { user } = useAuth()
  const [recurrings, setRecurrings] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('recurring_transactions')
      .select('*, categories(id, name, color)')
      .eq('user_id', user.id)
      .order('day_of_month')
    setRecurrings(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({ ...payload, user_id: user.id })
      .select('*, categories(id, name, color)')
      .single()
    if (!error) setRecurrings(p => [...p, data].sort((a, b) => a.day_of_month - b.day_of_month))
    return { data, error }
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, categories(id, name, color)')
      .single()
    if (!error) setRecurrings(p => p.map(r => r.id === id ? data : r))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setRecurrings(p => p.filter(r => r.id !== id))
    return { error }
  }

  return { recurrings, loading, create, update, remove, refetch: fetch }
}

/* ─── Generate this month's transactions ─────────────────────────────────── */
async function generateMonthly(user, recurrings, month, year, toast) {
  if (!recurrings.length) { toast.info('Nenhuma recorrência cadastrada.'); return 0 }

  const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
  const end   = format(new Date(year, month - 1, new Date(year, month, 0).getDate()), 'yyyy-MM-dd')

  // Check which ones already exist this month (by recurring_id tag)
  const { data: existing } = await supabase
    .from('transactions')
    .select('recurring_id')
    .eq('user_id', user.id)
    .gte('date', start)
    .lte('date', end)
    .not('recurring_id', 'is', null)

  const existingIds = new Set((existing || []).map(e => e.recurring_id))

  const toInsert = recurrings
    .filter(r => r.active && !existingIds.has(r.id))
    .map(r => {
      const day = Math.min(r.day_of_month, new Date(year, month, 0).getDate())
      return {
        user_id: user.id,
        type: r.type,
        description: r.description,
        amount: r.amount,
        category_id: r.category_id || null,
        date: `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        status: 'pendente',
        notes: `Gerado automaticamente — recorrência mensal`,
        recurring_id: r.id,
      }
    })

  if (!toInsert.length) { toast.info('Todos os lançamentos deste mês já foram gerados.'); return 0 }

  const { error } = await supabase.from('transactions').insert(toInsert)
  if (error) { toast.error('Erro ao gerar: ' + error.message); return 0 }
  return toInsert.length
}

/* ─── Form ────────────────────────────────────────────────────────────────── */
function RecurringForm({ isOpen, onClose, onSave, initial }) {
  const { categories } = useCategories()
  const blank = {
    type: 'despesa', description: '', amount: '', category_id: '',
    day_of_month: '5', active: true, notes: ''
  }
  const [form, setForm] = useState(blank)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initial
        ? { ...blank, ...initial, amount: String(initial.amount), day_of_month: String(initial.day_of_month), category_id: initial.category_id || '' }
        : blank)
      setErrors({})
    }
  }, [isOpen, initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.description.trim()) e.description = 'Informe a descrição'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Valor inválido'
    if (!form.day_of_month || Number(form.day_of_month) < 1 || Number(form.day_of_month) > 31) e.day_of_month = 'Dia entre 1 e 31'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    await onSave({
      ...form,
      amount: parseFloat(form.amount),
      day_of_month: parseInt(form.day_of_month),
      category_id: form.category_id || null,
    })
    setLoading(false)
    onClose()
  }

  const filteredCats = categories.filter(c => c.type === form.type)

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={initial ? 'Editar Recorrência' : 'Nova Despesa/Receita Fixa'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Salvar'}
        </button>
      </>}
    >
      {/* Info box */}
      <div style={{ background: 'var(--primary-glow)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={15} style={{ color: 'var(--primary-light)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
          Cadastre aqui seus gastos/receitas fixos mensais (aluguel, salário, assinaturas...). 
          Use o botão <strong style={{ color: 'var(--primary-light)' }}>"Gerar este mês"</strong> para lançar todos de uma vez como <em>pendente</em> no mês atual.
        </p>
      </div>

      {/* Type */}
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="type-toggle">
          <button className={`type-toggle-btn ${form.type === 'receita' ? 'active-receita' : ''}`}
            onClick={() => { set('type', 'receita'); set('category_id', '') }}>+ Receita fixa</button>
          <button className={`type-toggle-btn ${form.type === 'despesa' ? 'active-despesa' : ''}`}
            onClick={() => { set('type', 'despesa'); set('category_id', '') }}>- Despesa fixa</button>
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Descrição <span>*</span></label>
        <input className={`form-input ${errors.description ? 'error' : ''}`}
          placeholder="Ex: Aluguel, Netflix, Salário, Academia..."
          value={form.description} onChange={e => set('description', e.target.value)} />
        {errors.description && <span className="form-error">{errors.description}</span>}
      </div>

      <div className="form-grid form-grid-2">
        {/* Amount */}
        <div className="form-group">
          <label className="form-label">Valor <span>*</span></label>
          <input className={`form-input ${errors.amount ? 'error' : ''}`}
            type="number" step="0.01" placeholder="0,00"
            value={form.amount} onChange={e => set('amount', e.target.value)} />
          {errors.amount && <span className="form-error">{errors.amount}</span>}
        </div>

        {/* Day */}
        <div className="form-group">
          <label className="form-label">Dia do mês <span>*</span></label>
          <input className={`form-input ${errors.day_of_month ? 'error' : ''}`}
            type="number" min="1" max="31" placeholder="Ex: 5"
            value={form.day_of_month} onChange={e => set('day_of_month', e.target.value)} />
          {errors.day_of_month && <span className="form-error">{errors.day_of_month}</span>}
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dia em que vence/recebe todo mês</span>
        </div>
      </div>

      {/* Category */}
      <div className="form-group">
        <label className="form-label">Categoria</label>
        <select className="form-select" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
          <option value="">Sem categoria</option>
          {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Active */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" id="active" checked={form.active} onChange={e => set('active', e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} />
        <label htmlFor="active" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          Recorrência ativa (será gerada todo mês)
        </label>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Observações</label>
        <textarea className="form-textarea" rows={2}
          placeholder="Notas opcionais..." value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
    </Modal>
  )
}

/* ─── Card ────────────────────────────────────────────────────────────────── */
function RecurringCard({ item, onEdit, onDelete, onToggle }) {
  const typeColor = item.type === 'receita' ? 'var(--success)' : 'var(--danger)'
  const typeBg    = item.type === 'receita' ? 'var(--success-bg)' : 'var(--danger-bg)'

  return (
    <div className="card" style={{ opacity: item.active ? 1 : 0.55, borderLeft: `3px solid ${typeColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Day badge */}
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: typeBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: typeColor, lineHeight: 1 }}>{item.day_of_month}</span>
          <span style={{ fontSize: '0.55rem', color: typeColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>todo mês</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.description}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            {item.categories && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.categories.color, display: 'inline-block' }} />
                {item.categories.name}
              </span>
            )}
            <span className={`badge ${item.type === 'receita' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
              {item.type === 'receita' ? '+ Receita' : '- Despesa'}
            </span>
            {!item.active && <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>Pausada</span>}
          </div>
        </div>

        {/* Value */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: typeColor }}>
            {item.type === 'receita' ? '+' : '-'}{fmtCurrency(item.amount)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>por mês</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button
          className={`btn btn-sm ${item.active ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => onToggle(item.id, !item.active)}
          style={{ gap: 6, fontSize: '0.78rem' }}
        >
          {item.active ? <><Clock size={13} /> Pausar</> : <><Play size={13} /> Ativar</>}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(item)}><Pencil size={13} /></button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(item.id)}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function Recurring() {
  const { user } = useAuth()
  const { recurrings, loading, create, update, remove } = useRecurring()
  const toast = useToast()
  const [addOpen, setAddOpen]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const now = new Date()
  const monthLabel = format(now, 'MMMM yyyy', { locale: ptBR })

  const handleSave = async (payload) => {
    if (editItem) {
      const { error } = await update(editItem.id, payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Recorrência atualizada!')
    } else {
      const { error } = await create(payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Recorrência cadastrada!')
    }
    setEditItem(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await remove(deleteId)
    if (error) toast.error('Erro ao excluir')
    else toast.success('Recorrência removida!')
    setDeleteId(null)
    setDeleting(false)
  }

  const handleToggle = async (id, active) => {
    await update(id, { active })
    toast.info(active ? 'Recorrência ativada!' : 'Recorrência pausada.')
  }

  const handleGenerate = async () => {
    setGenerating(true)
    const count = await generateMonthly(user, recurrings, now.getMonth() + 1, now.getFullYear(), toast)
    if (count > 0) toast.success(`✅ ${count} lançamento${count > 1 ? 's gerados' : ' gerado'} como pendente em ${monthLabel}!`)
    setGenerating(false)
  }

  const active = recurrings.filter(r => r.active)
  const paused = recurrings.filter(r => !r.active)
  const totalFixoReceitas = active.filter(r => r.type === 'receita').reduce((s, r) => s + r.amount, 0)
  const totalFixoDespesas = active.filter(r => r.type === 'despesa').reduce((s, r) => s + r.amount, 0)

  const filtered = recurrings.filter(r => filterType === 'all' || r.type === filterType)

  return (
    <div className="page-container">
      <PageHeader
        title="Despesas & Receitas Fixas"
        subtitle="Cadastre uma vez, gere todo mês automaticamente"
        action={
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setAddOpen(true) }}>
            <Plus size={18} /><span className="hide-sm">Nova</span>
          </button>
        }
      />

      {/* Summary */}
      {recurrings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Receitas fixas/mês</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--success)' }}>+{fmtCurrency(totalFixoReceitas)}</div>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Despesas fixas/mês</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--danger)' }}>-{fmtCurrency(totalFixoDespesas)}</div>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: totalFixoReceitas - totalFixoDespesas >= 0 ? 'var(--primary)' : 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Saldo fixo/mês</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: totalFixoReceitas - totalFixoDespesas >= 0 ? 'var(--primary)' : 'var(--warning)' }}>
              {fmtCurrency(totalFixoReceitas - totalFixoDespesas)}
            </div>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total cadastradas</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{active.length} ativas · {paused.length} pausadas</div>
          </div>
        </div>
      )}

      {/* Generate button */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        marginBottom: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 2 }}>
            Gerar lançamentos de <span style={{ color: 'var(--primary-light)', textTransform: 'capitalize' }}>{monthLabel}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Cria todos os lançamentos fixos ativos como <strong>pendente</strong> no mês atual. Lançamentos já gerados são ignorados.
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating || active.length === 0}
          style={{ gap: 8, whiteSpace: 'nowrap' }}
        >
          {generating ? <Spinner size={16} /> : <RefreshCw size={16} />}
          {generating ? 'Gerando...' : 'Gerar este mês'}
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ v: 'all', l: 'Todas' }, { v: 'despesa', l: '- Despesas' }, { v: 'receita', l: '+ Receitas' }].map(f => (
          <button key={f.v} className={`filter-chip ${filterType === f.v ? 'active' : ''}`}
            onClick={() => setFilterType(f.v)}>{f.l}</button>
        ))}
      </div>

      {/* List */}
      {recurrings.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Nenhuma recorrência cadastrada"
          message="Cadastre seus gastos e receitas fixos mensais: aluguel, salário, Netflix, academia, financiamento..."
          action={
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Adicionar recorrência
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.filter(r => r.active).length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                Ativas — geradas todo mês
              </div>
              {filtered.filter(r => r.active).map(r => (
                <RecurringCard key={r.id} item={r} onEdit={setEditItem} onDelete={setDeleteId} onToggle={handleToggle} />
              ))}
            </>
          )}
          {filtered.filter(r => !r.active).length > 0 && (
            <>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>
                Pausadas
              </div>
              {filtered.filter(r => !r.active).map(r => (
                <RecurringCard key={r.id} item={r} onEdit={setEditItem} onDelete={setDeleteId} onToggle={handleToggle} />
              ))}
            </>
          )}
        </div>
      )}

      <RecurringForm
        isOpen={addOpen || !!editItem}
        onClose={() => { setAddOpen(false); setEditItem(null) }}
        onSave={handleSave}
        initial={editItem}
      />
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir recorrência"
        message="Esta recorrência será removida. Os lançamentos já gerados não serão afetados."
      />
    </div>
  )
}

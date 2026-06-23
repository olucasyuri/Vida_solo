import { useState, useEffect } from 'react'
import { Save, DollarSign } from 'lucide-react'
import { Modal, Spinner } from './UI'
import { useCategories } from '../hooks/useFinance'
import { format } from 'date-fns'

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000]

export function TransactionForm({ isOpen, onClose, onSave, initial, defaultType = 'despesa' }) {
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const blank = {
    type: defaultType,
    description: '',
    amount: '',
    category_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'pago',
    notes: '',
  }

  const [form, setForm] = useState(blank)

  useEffect(() => {
    if (isOpen) {
      setForm(initial ? { ...blank, ...initial, amount: String(initial.amount || '') } : { ...blank, type: defaultType })
      setErrors({})
    }
  }, [isOpen, initial, defaultType])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.description.trim()) e.description = 'Informe uma descrição'
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = 'Informe um valor válido'
    if (!form.date) e.date = 'Informe a data'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    const payload = {
      ...form,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
    }
    await onSave(payload)
    setLoading(false)
    onClose()
  }

  const filteredCats = categories.filter(c => c.type === form.type)

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={initial ? 'Editar Lançamento' : 'Novo Lançamento'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <Spinner size={16} /> : <><Save size={16} />Salvar</>}
        </button>
      </>}
    >
      {/* Type Toggle */}
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="type-toggle">
          <button
            className={`type-toggle-btn ${form.type === 'receita' ? 'active-receita' : ''}`}
            onClick={() => { set('type', 'receita'); set('category_id', '') }}>
            + Receita
          </button>
          <button
            className={`type-toggle-btn ${form.type === 'despesa' ? 'active-despesa' : ''}`}
            onClick={() => { set('type', 'despesa'); set('category_id', '') }}>
            - Despesa
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Descrição <span>*</span></label>
        <input className={`form-input ${errors.description ? 'error' : ''}`}
          placeholder="Ex: Salário, Supermercado, Aluguel..."
          value={form.description}
          onChange={e => set('description', e.target.value)}
          maxLength={120}
        />
        {errors.description && <span className="form-error">{errors.description}</span>}
      </div>

      {/* Amount */}
      <div className="form-group">
        <label className="form-label">Valor <span>*</span></label>
        <div style={{ position: 'relative' }}>
          <DollarSign size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className={`form-input ${errors.amount ? 'error' : ''}`}
            style={{ paddingLeft: 36 }}
            type="number" step="0.01" min="0.01"
            placeholder="0,00"
            value={form.amount}
            onChange={e => set('amount', e.target.value)}
          />
        </div>
        {errors.amount && <span className="form-error">{errors.amount}</span>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {PRESET_AMOUNTS.map(a => (
            <button key={a} className="btn btn-secondary btn-sm"
              onClick={() => set('amount', String(a))}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              R$ {a}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid form-grid-2">
        {/* Date */}
        <div className="form-group">
          <label className="form-label">Data <span>*</span></label>
          <input className={`form-input ${errors.date ? 'error' : ''}`}
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
          {errors.date && <span className="form-error">{errors.date}</span>}
        </div>

        {/* Status */}
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="pago">✅ Pago</option>
            <option value="pendente">⏳ Pendente</option>
            <option value="cancelado">❌ Cancelado</option>
          </select>
        </div>
      </div>

      {/* Category */}
      <div className="form-group">
        <label className="form-label">Categoria</label>
        <select className="form-select" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
          <option value="">Sem categoria</option>
          {filteredCats.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">Observações</label>
        <textarea className="form-textarea"
          placeholder="Notas adicionais (opcional)..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
        />
      </div>
    </Modal>
  )
}

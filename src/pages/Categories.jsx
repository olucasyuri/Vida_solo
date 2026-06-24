import { useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { useCategories } from '../hooks/useFinance'
import { useToast } from '../contexts/ToastContext'
import { Modal, ConfirmDialog, EmptyState, LoadingPage, PageHeader } from '../components/UI'
import { Spinner } from '../components/UI'

const COLORS = [
  '#6C47FF', '#10B981', '#EF4444', '#F59E0B', '#06B6D4',
  '#EC4899', '#8B5CF6', '#3B82F6', '#F97316', '#14B8A6',
  '#84CC16', '#6366F1', '#A855F7', '#22C55E', '#EAB308'
]

const ICONS = ['tag', 'wallet', 'home', 'car', 'utensils', 'heart', 'book', 'briefcase', 'smile', 'shopping-bag', 'trending-up', 'more-horizontal']

function CategoryForm({ isOpen, onClose, onSave, initial }) {
  const [form, setForm] = useState({ name: '', type: 'despesa', color: '#6C47FF', icon: 'tag' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useState(() => {
    if (isOpen) setForm(initial || { name: '', type: 'despesa', color: '#6C47FF', icon: 'tag' })
  }, [isOpen, initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const handleSave = async () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Informe o nome'
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    await onSave(form)
    setLoading(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}
      title={initial ? 'Editar Categoria' : 'Nova Categoria'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Salvar'}
        </button>
      </>}
    >
      <div className="form-group">
        <label className="form-label">Tipo</label>
        <div className="type-toggle">
          <button className={`type-toggle-btn ${form.type === 'receita' ? 'active-receita' : ''}`}
            onClick={() => set('type', 'receita')}>+ Receita</button>
          <button className={`type-toggle-btn ${form.type === 'despesa' ? 'active-despesa' : ''}`}
            onClick={() => set('type', 'despesa')}>- Despesa</button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Nome <span>*</span></label>
        <input className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="Ex: Alimentação, Salário..." value={form.name}
          onChange={e => set('name', e.target.value)} maxLength={40} />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label className="form-label">Cor</label>
        <div className="color-grid">
          {COLORS.map(c => (
            <div key={c} className={`color-dot ${form.color === c ? 'selected' : ''}`}
              style={{ background: c }} onClick={() => set('color', c)} />
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default function Categories() {
  const { categories, loading, create, update, remove } = useCategories()
  const toast = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [filter, setFilter] = useState('all')

  const handleSave = async (payload) => {
    if (editItem) {
      const { error } = await update(editItem.id, payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Categoria atualizada!')
    } else {
      const { error } = await create(payload)
      if (error) toast.error('Erro: ' + error.message)
      else toast.success('Categoria criada!')
    }
    setEditItem(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await remove(deleteId)
    if (error) toast.error('Erro ao excluir. Categoria pode estar em uso.')
    else toast.success('Categoria excluída!')
    setDeleteId(null)
    setDeleting(false)
  }

  const filtered = filter === 'all' ? categories : categories.filter(c => c.type === filter)
  const receitas = categories.filter(c => c.type === 'receita')
  const despesas = categories.filter(c => c.type === 'despesa')

  if (loading) return <LoadingPage />

  return (
    <div className="page-container">
      <PageHeader
        title="Categorias"
        subtitle={`${categories.length} categorias cadastradas`}
        action={
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setAddOpen(true) }}>
            <Plus size={18} /><span className="hide-sm">Nova</span>
          </button>
        }
      />

      {/* Stats */}
      <div className="categories-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Receitas</div>
          <div style={{ fontWeight: 800, fontSize: '1.5rem' }}>{receitas.length}</div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Despesas</div>
          <div style={{ fontWeight: 800, fontSize: '1.5rem' }}>{despesas.length}</div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ v: 'all', l: 'Todas' }, { v: 'receita', l: 'Receitas' }, { v: 'despesa', l: 'Despesas' }].map(o => (
          <button key={o.v} className={`filter-chip ${filter === o.v ? 'active' : ''}`}
            onClick={() => setFilter(o.v)}>{o.l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Tags} title="Nenhuma categoria ainda"
          message="Crie categorias para organizar seus lançamentos."
          action={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Criar categoria</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(cat => (
            <div key={cat.id} className="card" style={{ borderLeft: `3px solid ${cat.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: `${cat.color}22`,
                  border: `1px solid ${cat.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: cat.color }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</div>
                  <span className={`badge ${cat.type === 'receita' ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: 4, display: 'inline-flex' }}>
                    {cat.type === 'receita' ? '+ Receita' : '- Despesa'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditItem(cat); setAddOpen(true) }}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => setDeleteId(cat.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryForm isOpen={addOpen} onClose={() => { setAddOpen(false); setEditItem(null) }}
        onSave={handleSave} initial={editItem} />
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={handleDelete} loading={deleting}
        title="Excluir categoria"
        message="Esta categoria será removida. Lançamentos associados ficarão sem categoria." />
    </div>
  )
}

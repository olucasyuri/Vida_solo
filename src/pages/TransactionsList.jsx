import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown, SlidersHorizontal } from 'lucide-react'
import { useTransactions, useCategories } from '../hooks/useFinance'
import { useToast } from '../contexts/ToastContext'
import { TransactionForm } from '../components/TransactionForm'
import {
  MonthSelector, fmtCurrency, Amount, StatusBadge,
  CategoryDot, ConfirmDialog, EmptyState, LoadingPage, PageHeader
} from '../components/UI'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function TransactionsList({ type, title, subtitle, defaultStatus = '' }) {
  const [date, setDate] = useState(new Date())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(defaultStatus)
  const [catFilter, setCatFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const toast = useToast()

  const month = date.getMonth() + 1
  const year = date.getFullYear()

  const filters = {
    month, year,
    ...(type ? { type } : {}),
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(catFilter ? { category_id: catFilter } : {}),
  }

  const { transactions, loading, create, update, remove } = useTransactions(filters)
  const { categories } = useCategories()

  const filteredCats = type ? categories.filter(c => c.type === type) : categories
  const totalReceitas = transactions.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0)
  const totalDespesas = transactions.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0)
  const total = type === 'receita' ? totalReceitas : type === 'despesa' ? totalDespesas : totalReceitas + totalDespesas

  const handleSave = async (payload) => {
    if (editItem) {
      const { error } = await update(editItem.id, payload)
      if (error) toast.error('Erro ao atualizar: ' + error.message)
      else toast.success('Atualizado com sucesso!')
    } else {
      const { error } = await create(payload)
      if (error) toast.error('Erro ao salvar: ' + error.message)
      else toast.success('Lançamento salvo!')
    }
    setEditItem(null)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await remove(deleteId)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else toast.success('Excluído com sucesso!')
    setDeleteId(null)
    setDeleting(false)
  }

  const hasActiveFilters = search || (statusFilter && statusFilter !== defaultStatus) || catFilter

  if (loading && transactions.length === 0) return <LoadingPage />

  return (
    <div className="page-container">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <button className="btn btn-primary" onClick={() => { setEditItem(null); setAddOpen(true) }}>
            <Plus size={18} /><span className="hide-sm">Novo</span>
          </button>
        }
      />

      {/* Summary Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {type === 'receita' && (
          <div style={{
            background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px', flex: 1, minWidth: 140
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total Receitas</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--success)' }}>{fmtCurrency(total)}</div>
          </div>
        )}
        {type === 'despesa' && (
          <div style={{
            background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px', flex: 1, minWidth: 140
          }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Total Despesas</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--danger)' }}>{fmtCurrency(total)}</div>
          </div>
        )}
        {!type && (
          <>
            <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Receitas</div>
              <div style={{ fontWeight: 800, color: 'var(--success)' }}>{fmtCurrency(totalReceitas)}</div>
            </div>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Despesas</div>
              <div style={{ fontWeight: 800, color: 'var(--danger)' }}>{fmtCurrency(totalDespesas)}</div>
            </div>
          </>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center', whiteSpace: 'nowrap' }}>
          {transactions.length} registro{transactions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20
      }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <MonthSelector value={date} onChange={setDate} />
          <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
            <Search size={16} />
            <input className="form-input" placeholder="Buscar lançamentos..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFilters(v => !v)}
            style={{ gap: 6, ...(showFilters ? { background: 'var(--primary-glow)', borderColor: 'var(--primary)', color: 'var(--primary-light)' } : {}) }}
          >
            <SlidersHorizontal size={15} /> Filtros
          </button>
        </div>

        {showFilters && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos os status</option>
                <option value="pago">✅ Pago / Recebido</option>
                <option value="pendente">⏳ Pendente</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <select className="form-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">Todas as categorias</option>
                {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setStatusFilter(defaultStatus); setCatFilter(''); setSearch('') }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {transactions.length === 0 ? (
        <EmptyState
          icon={type === 'receita' ? TrendingUp : TrendingDown}
          title={search || hasActiveFilters ? 'Nenhum resultado encontrado' : `Nenhum lançamento neste mês`}
          message={search ? 'Tente outros termos de busca.' : 'Clique em "+ Novo" para adicionar.'}
          action={!search && !hasActiveFilters ? (
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Adicionar
            </button>
          ) : null}
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {transactions.map((t, i) => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: i < transactions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              transition: 'background var(--transition)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: t.type === 'receita' ? 'var(--success-bg)' : 'var(--danger-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {t.type === 'receita'
                  ? <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                  : <TrendingDown size={18} style={{ color: 'var(--danger)' }} />
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {t.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  {t.categories && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.categories.color, display: 'inline-block' }} />
                      {t.categories.name}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
                {t.notes && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                    {t.notes}
                  </div>
                )}
              </div>

              {/* Value + Actions */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <Amount value={t.amount} type={t.type} />
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => { setEditItem(t); setAddOpen(true) }} title="Editar">
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-danger btn-icon btn-sm"
                    onClick={() => setDeleteId(t.id)} title="Excluir">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionForm
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setEditItem(null) }}
        onSave={handleSave}
        initial={editItem}
        defaultType={type || 'despesa'}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir lançamento"
        message="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
      />
    </div>
  )
}

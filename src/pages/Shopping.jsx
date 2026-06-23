import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ShoppingCart, Store, CheckSquare, Square, TrendingDown, Search, Pencil, X, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Modal, ConfirmDialog, Spinner, EmptyState, PageHeader, fmtCurrency } from '../components/UI'

/* ─── Hook ────────────────────────────────────────────────────────────────── */
function useShopping() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [items, setItems] = useState([])
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user) return
    const [l, i, m] = await Promise.all([
      supabase.from('shopping_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('shopping_items').select('*, shopping_prices(*)').eq('user_id', user.id),
      supabase.from('markets').select('*').eq('user_id', user.id).order('name'),
    ])
    setLists(l.data || [])
    setItems(i.data || [])
    setMarkets(m.data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { lists, items, markets, loading, refetch: fetchAll,
    createList: async (name) => {
      const { data, error } = await supabase.from('shopping_lists').insert({ name, user_id: user.id }).select().single()
      if (!error) setLists(p => [data, ...p])
      return { data, error }
    },
    deleteList: async (id) => {
      const { error } = await supabase.from('shopping_lists').delete().eq('id', id).eq('user_id', user.id)
      if (!error) { setLists(p => p.filter(l => l.id !== id)); setItems(p => p.filter(i => i.list_id !== id)) }
      return { error }
    },
    addItem: async (listId, name, qty, unit) => {
      const { data, error } = await supabase.from('shopping_items').insert({ list_id: listId, user_id: user.id, name, quantity: qty || 1, unit: unit || 'un', checked: false }).select('*, shopping_prices(*)').single()
      if (!error) setItems(p => [...p, data])
      return { data, error }
    },
    toggleItem: async (id, checked) => {
      await supabase.from('shopping_items').update({ checked }).eq('id', id).eq('user_id', user.id)
      setItems(p => p.map(i => i.id === id ? { ...i, checked } : i))
    },
    deleteItem: async (id) => {
      await supabase.from('shopping_items').delete().eq('id', id).eq('user_id', user.id)
      setItems(p => p.filter(i => i.id !== id))
    },
    addMarket: async (name) => {
      const { data, error } = await supabase.from('markets').insert({ name, user_id: user.id }).select().single()
      if (!error) setMarkets(p => [...p, data].sort((a,b) => a.name.localeCompare(b.name)))
      return { data, error }
    },
    deleteMarket: async (id) => {
      await supabase.from('markets').delete().eq('id', id).eq('user_id', user.id)
      setMarkets(p => p.filter(m => m.id !== id))
    },
    upsertPrice: async (itemId, marketId, price) => {
      const { data } = await supabase.from('shopping_prices').upsert(
        { item_id: itemId, market_id: marketId, price: parseFloat(price), user_id: user.id },
        { onConflict: 'item_id,market_id' }
      ).select().single()
      setItems(p => p.map(i => {
        if (i.id !== itemId) return i
        const prices = i.shopping_prices || []
        const exists = prices.find(pp => pp.market_id === marketId)
        return { ...i, shopping_prices: exists ? prices.map(pp => pp.market_id === marketId ? data : pp) : [...prices, data] }
      }))
    },
  }
}

/* ─── Price Table Component ───────────────────────────────────────────────── */
function PriceTable({ items, markets, onUpsertPrice, onToggle, onDeleteItem }) {
  const [editCell, setEditCell] = useState(null) // {itemId, marketId}
  const [val, setVal] = useState('')

  const getPrice = (item, marketId) => item.shopping_prices?.find(p => p.market_id === marketId)?.price

  const handleSave = async () => {
    if (editCell && val) {
      await onUpsertPrice(editCell.itemId, editCell.marketId, val)
    }
    setEditCell(null); setVal('')
  }

  // Calculate best market for full list
  const marketTotals = markets.map(m => {
    let total = 0; let missing = 0
    items.forEach(item => {
      const p = getPrice(item, m.id)
      if (p) total += p * (item.quantity || 1)
      else missing++
    })
    return { ...m, total, missing }
  }).filter(m => m.total > 0).sort((a, b) => a.total - b.total)

  const bestMarket = marketTotals[0]

  return (
    <div>
      {bestMarket && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{bestMarket.name}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}> é o mais barato — </span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{fmtCurrency(bestMarket.total)}</span>
            {bestMarket.missing > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({bestMarket.missing} sem preço)</span>}
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th style={{ textAlign: 'center' }}>Qtd</th>
              {markets.map(m => <th key={m.id} style={{ textAlign: 'center' }}>{m.name}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const prices = markets.map(m => getPrice(item, m.id)).filter(Boolean)
              const minPrice = prices.length ? Math.min(...prices) : null

              return (
                <tr key={item.id} style={{ opacity: item.checked ? 0.5 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => onToggle(item.id, !item.checked)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.checked ? 'var(--success)' : 'var(--text-muted)', padding: 0, display: 'flex' }}>
                        {item.checked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', textDecoration: item.checked ? 'line-through' : 'none' }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.quantity} {item.unit}</td>
                  {markets.map(m => {
                    const price = getPrice(item, m.id)
                    const isBest = price && price === minPrice && prices.length > 1
                    const isEditing = editCell?.itemId === item.id && editCell?.marketId === m.id
                    return (
                      <td key={m.id} style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <input autoFocus className="form-input" type="number" step="0.01" value={val}
                              onChange={e => setVal(e.target.value)}
                              onBlur={handleSave}
                              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditCell(null); setVal('') } }}
                              style={{ width: 80, padding: '4px 8px', fontSize: '0.8rem' }} />
                          </div>
                        ) : (
                          <button onClick={() => { setEditCell({ itemId: item.id, marketId: m.id }); setVal(price ? String(price) : '') }}
                            style={{ background: isBest ? 'var(--success-bg)' : 'transparent', color: isBest ? 'var(--success)' : price ? 'var(--text-primary)' : 'var(--text-muted)', border: isBest ? '1px solid rgba(16,185,129,0.3)' : '1px dashed var(--border-subtle)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: isBest ? 700 : 400, fontSize: '0.8rem', minWidth: 70 }}>
                            {price ? fmtCurrency(price) : '+ preço'}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDeleteItem(item.id)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              )
            })}
            {/* Total row */}
            {marketTotals.length > 0 && (
              <tr style={{ background: 'var(--bg-hover)' }}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</td>
                <td></td>
                {markets.map(m => {
                  const mt = marketTotals.find(x => x.id === m.id)
                  const isBest = mt && mt.id === bestMarket?.id
                  return (
                    <td key={m.id} style={{ textAlign: 'center', fontWeight: 700, color: isBest ? 'var(--success)' : 'var(--text-primary)' }}>
                      {mt ? <>{fmtCurrency(mt.total)}{isBest && ' 🏆'}</> : '—'}
                    </td>
                  )
                })}
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export default function Shopping() {
  const { lists, items, markets, loading, createList, deleteList, addItem, toggleItem, deleteItem, addMarket, deleteMarket, upsertPrice } = useShopping()
  const toast = useToast()
  const [activeList, setActiveList] = useState(null)
  const [newListName, setNewListName] = useState('')
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', unit: 'un' })
  const [newMarket, setNewMarket] = useState('')
  const [tab, setTab] = useState('lista') // lista | mercados
  const [deleteListId, setDeleteListId] = useState(null)

  useEffect(() => { if (lists.length > 0 && !activeList) setActiveList(lists[0]) }, [lists])

  const listItems = items.filter(i => i.list_id === activeList?.id)
  const checkedCount = listItems.filter(i => i.checked).length

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    const { data, error } = await createList(newListName.trim())
    if (error) toast.error('Erro ao criar lista')
    else { setActiveList(data); setNewListName(''); toast.success('Lista criada!') }
  }

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !activeList) return
    const { error } = await addItem(activeList.id, newItem.name.trim(), parseFloat(newItem.quantity) || 1, newItem.unit)
    if (error) toast.error('Erro ao adicionar')
    else setNewItem({ name: '', quantity: '1', unit: 'un' })
  }

  const handleAddMarket = async () => {
    if (!newMarket.trim()) return
    const { error } = await addMarket(newMarket.trim())
    if (error) toast.error('Erro ao adicionar mercado')
    else { setNewMarket(''); toast.success('Mercado adicionado!') }
  }

  return (
    <div className="page-container">
      <PageHeader title="Lista de Compras" subtitle="Compare preços entre mercados e economize" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ v: 'lista', l: '🛒 Listas' }, { v: 'mercados', l: '🏪 Mercados' }].map(t => (
          <button key={t.v} className={`filter-chip ${tab === t.v ? 'active' : ''}`} onClick={() => setTab(t.v)}>{t.l}</button>
        ))}
      </div>

      {tab === 'mercados' ? (
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Mercados cadastrados</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="form-input" placeholder="Nome do mercado..." value={newMarket} onChange={e => setNewMarket(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMarket()} />
            <button className="btn btn-primary" onClick={handleAddMarket} disabled={!newMarket.trim()}><Plus size={16} /></button>
          </div>
          {markets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cadastre mercados para comparar preços</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {markets.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Store size={16} style={{ color: 'var(--primary-light)' }} />
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                  </div>
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteMarket(m.id)}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
          {/* Lists sidebar */}
          <div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Suas listas</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <input className="form-input" style={{ fontSize: '0.8125rem', padding: '7px 10px' }}
                  placeholder="Nova lista..." value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateList()} />
                <button className="btn btn-primary btn-sm btn-icon" onClick={handleCreateList} disabled={!newListName.trim()}><Plus size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {lists.map(l => {
                  const count = items.filter(i => i.list_id === l.id).length
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setActiveList(l)}
                        style={{ flex: 1, textAlign: 'left', background: activeList?.id === l.id ? 'var(--primary-glow)' : 'transparent', border: activeList?.id === l.id ? '1px solid var(--primary)' : '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '7px 10px', color: activeList?.id === l.id ? 'var(--primary-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: activeList?.id === l.id ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{count}</span>
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteListId(l.id)} style={{ padding: 4, flexShrink: 0 }}><Trash2 size={12} /></button>
                    </div>
                  )
                })}
                {lists.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhuma lista ainda</p>}
              </div>
            </div>
          </div>

          {/* Active list */}
          <div>
            {!activeList ? (
              <EmptyState icon={ShoppingCart} title="Selecione ou crie uma lista" message="Use o painel ao lado para criar sua primeira lista de compras" />
            ) : (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3>{activeList.name}</h3>
                    <p style={{ fontSize: '0.8rem' }}>{checkedCount}/{listItems.length} itens marcados</p>
                  </div>
                  {markets.length === 0 && (
                    <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: '0.78rem', color: 'var(--warning)' }}>
                      ⚠ Cadastre mercados para comparar preços
                    </div>
                  )}
                </div>

                {/* Add item */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <input className="form-input" style={{ flex: 2, minWidth: 140 }} placeholder="Nome do produto..."
                    value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem()} />
                  <input className="form-input" style={{ width: 70 }} type="number" step="0.1" placeholder="Qtd"
                    value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))} />
                  <select className="form-select" style={{ width: 80 }} value={newItem.unit}
                    onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}>
                    {['un', 'kg', 'g', 'L', 'ml', 'cx', 'pct'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={handleAddItem} disabled={!newItem.name.trim()}>
                    <Plus size={16} /> Adicionar
                  </button>
                </div>

                {listItems.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>Adicione itens à sua lista</p>
                ) : (
                  <PriceTable items={listItems} markets={markets} onUpsertPrice={upsertPrice} onToggle={toggleItem} onDeleteItem={deleteItem} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteListId} onClose={() => setDeleteListId(null)}
        onConfirm={async () => { await deleteList(deleteListId); if (activeList?.id === deleteListId) setActiveList(lists.find(l => l.id !== deleteListId) || null); setDeleteListId(null); toast.success('Lista removida!') }}
        title="Excluir lista" message="Todos os itens e preços desta lista serão removidos." />
    </div>
  )
}

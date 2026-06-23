import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ─── Transactions ──────────────────────────────────────────────────────────

export function useTransactions(filters = {}) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('transactions')
        .select('*, categories(id, name, color, icon)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.month && filters.year) {
        const start = `${filters.year}-${String(filters.month).padStart(2,'0')}-01`
        const end = new Date(filters.year, filters.month, 0)
        const endStr = `${filters.year}-${String(filters.month).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`
        query = query.gte('date', start).lte('date', endStr)
      }
      if (filters.type) query = query.eq('type', filters.type)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)

      const { data, error: err } = await query
      if (err) throw err
      setTransactions(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...payload, user_id: user.id })
      .select('*, categories(id, name, color, icon)')
      .single()
    if (!error) { setTransactions(prev => [data, ...prev]) }
    return { data, error }
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, categories(id, name, color, icon)')
      .single()
    if (!error) { setTransactions(prev => prev.map(t => t.id === id ? data : t)) }
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) { setTransactions(prev => prev.filter(t => t.id !== id)) }
    return { error }
  }

  return { transactions, loading, error, refetch: fetch, create, update, remove }
}

// ─── Categories ───────────────────────────────────────────────────────────

export function useCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name')
    setCategories(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...payload, user_id: user.id })
      .select().single()
    if (!error) setCategories(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)))
    return { data, error }
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select().single()
    if (!error) setCategories(prev => prev.map(c => c.id === id ? data : c))
    return { data, error }
  }

  const remove = async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setCategories(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { categories, loading, refetch: fetch, create, update, remove }
}

// ─── Dashboard Summary ─────────────────────────────────────────────────────

export function useDashboard(month, year) {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const start = `${year}-${String(month).padStart(2,'0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

      const { data } = await supabase
        .from('transactions')
        .select('type, amount, status, categories(name, color)')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)

      if (!data) { setLoading(false); return }

      const receitas = data.filter(t => t.type === 'receita').reduce((s,t) => s + Number(t.amount), 0)
      const despesas = data.filter(t => t.type === 'despesa').reduce((s,t) => s + Number(t.amount), 0)
      const pendentes = data.filter(t => t.status === 'pendente').reduce((s,t) => s + Number(t.amount), 0)
      const pagas = data.filter(t => t.type === 'despesa' && t.status === 'pago').reduce((s,t) => s + Number(t.amount), 0)

      // Expenses by category for donut chart
      const byCat = {}
      data.filter(t => t.type === 'despesa').forEach(t => {
        const key = t.categories?.name || 'Sem categoria'
        const color = t.categories?.color || '#6B7280'
        if (!byCat[key]) byCat[key] = { name: key, value: 0, color }
        byCat[key].value += Number(t.amount)
      })

      setSummary({
        receitas, despesas,
        saldo: receitas - despesas,
        pendentes, pagas,
        byCategory: Object.values(byCat).sort((a,b) => b.value - a.value).slice(0, 8),
        total: data.length
      })
      setLoading(false)
    }
    load()
  }, [user, month, year])

  return { summary, loading }
}

// ─── Monthly Trend (last 6 months) ────────────────────────────────────────

export function useMonthlyTrend() {
  const { user } = useAuth()
  const [trend, setTrend] = useState([])

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
      }

      const results = await Promise.all(months.map(async ({ year, month }) => {
        const start = `${year}-${String(month).padStart(2,'0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const end = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
        const { data } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('user_id', user.id)
          .gte('date', start).lte('date', end)
        const receitas = (data||[]).filter(t=>t.type==='receita').reduce((s,t)=>s+Number(t.amount),0)
        const despesas = (data||[]).filter(t=>t.type==='despesa').reduce((s,t)=>s+Number(t.amount),0)
        const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        return { name: monthNames[month-1], receitas, despesas }
      }))
      setTrend(results)
    }
    load()
  }, [user])

  return trend
}

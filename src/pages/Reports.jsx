import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import { useDashboard, useMonthlyTrend, useTransactions } from '../hooks/useFinance'
import { MonthSelector, fmtCurrency, LoadingPage, PageHeader, CategoryDot } from '../components/UI'
import { TrendingUp, TrendingDown, Target, BarChart2 } from 'lucide-react'

export default function Reports() {
  const [date, setDate] = useState(new Date())
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  const { summary, loading } = useDashboard(month, year)
  const trend = useMonthlyTrend()
  const { transactions } = useTransactions({ month, year })

  if (loading) return <LoadingPage />

  const s = summary || { receitas: 0, despesas: 0, saldo: 0, byCategory: [] }
  const balance = s.receitas - s.despesas
  const savingsRate = s.receitas > 0 ? ((balance / s.receitas) * 100).toFixed(1) : 0

  // Daily spending for current month
  const dailyMap = {}
  transactions.filter(t => t.type === 'despesa').forEach(t => {
    const day = t.date.slice(8, 10)
    dailyMap[day] = (dailyMap[day] || 0) + Number(t.amount)
  })
  const dailyData = Object.entries(dailyMap)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([day, value]) => ({ day: parseInt(day), value }))

  return (
    <div className="page-container">
      <PageHeader
        title="Relatórios"
        subtitle="Análise financeira detalhada"
        action={<MonthSelector value={date} onChange={setDate} />}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Receitas', value: fmtCurrency(s.receitas), color: 'var(--success)', bg: 'var(--success-bg)', icon: TrendingUp },
          { label: 'Despesas', value: fmtCurrency(s.despesas), color: 'var(--danger)', bg: 'var(--danger-bg)', icon: TrendingDown },
          { label: 'Saldo', value: fmtCurrency(balance), color: balance >= 0 ? 'var(--success)' : 'var(--danger)', bg: balance >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', icon: Target },
          { label: 'Taxa de Poupança', value: `${savingsRate}%`, color: 'var(--primary)', bg: 'var(--primary-glow)', icon: BarChart2 },
        ].map(kpi => (
          <div key={kpi.label} className="card" style={{ padding: '16px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <kpi.icon size={18} style={{ color: kpi.color }} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{kpi.label}</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: kpi.color }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Trend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Evolução Mensal — Últimos 6 Meses</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            <Tooltip
              formatter={(v, n) => [fmtCurrency(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
              labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} formatter={v => v === 'receitas' ? 'Receitas' : 'Despesas'} />
            <Bar dataKey="receitas" fill="#10B981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="despesas" fill="#EF4444" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, marginBottom: 20 }}>
        {/* Category Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Despesas por Categoria</h3>
          {s.byCategory.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.875rem' }}>Sem dados neste mês</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={s.byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={2}>
                    {s.byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmtCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {s.byCategory.map((cat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <CategoryDot color={cat.color} name={cat.name} size={8} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{s.despesas > 0 ? ((cat.value/s.despesas)*100).toFixed(0) : 0}%</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmtCurrency(cat.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily Spending */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Gastos Diários</h3>
          {dailyData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.875rem' }}>Sem despesas neste mês</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gDay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C47FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6C47FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={v => [fmtCurrency(v), 'Gastos']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
                  labelFormatter={d => `Dia ${d}`} />
                <Area type="monotone" dataKey="value" stroke="#6C47FF" strokeWidth={2} fill="url(#gDay)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}

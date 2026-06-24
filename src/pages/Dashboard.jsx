import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, Clock, CheckCircle2,
  Plus, ArrowRight, AlertCircle, Eye, EyeOff
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useDashboard, useMonthlyTrend, useTransactions } from '../hooks/useFinance'
import { MonthSelector, fmtCurrency, LoadingPage, EmptyState, StatusBadge, Amount } from '../components/UI'
import { TransactionForm } from '../components/TransactionForm'
import { useToast } from '../contexts/ToastContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function StatCard({ title, value, icon: Icon, color, bg, subtitle, hideValues }) {
  return (
    <div className="stat-card" style={{ '--accent-color': color }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {hideValues ? <span style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>••••••</span> : fmtCurrency(value)}
      </div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  )
}

const RADIAN = Math.PI / 180
const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>
}

export default function Dashboard() {
  const [date, setDate] = useState(new Date())
  const [addOpen, setAddOpen] = useState(false)
  const [hideValues, setHideValues] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  const month = date.getMonth() + 1
  const year = date.getFullYear()

  const { summary, loading } = useDashboard(month, year)
  const trend = useMonthlyTrend()
  const { transactions: recent } = useTransactions({ month, year })
  const { create } = useTransactions({ month: 99 }) // for create only

  const monthLabel = format(date, 'MMMM yyyy', { locale: ptBR })

  const handleSave = async (payload) => {
    const { error } = await create(payload)
    if (error) toast.error('Erro ao salvar: ' + error.message)
    else toast.success('Lançamento salvo com sucesso!')
  }

  if (loading && !summary) return <LoadingPage />

  const s = summary || { receitas: 0, despesas: 0, saldo: 0, pendentes: 0, pagas: 0, byCategory: [] }
  const recentList = recent.slice(0, 5)

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Dashboard</h1>
          <p style={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>{monthLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <MonthSelector value={date} onChange={setDate} />
          <button className="btn btn-ghost btn-icon" onClick={() => setHideValues(v => !v)} title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}>
            {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={18} />
            <span className="hide-sm">Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Saldo" value={s.saldo} icon={Wallet}
          color={s.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}
          bg={s.saldo >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)'}
          hideValues={hideValues}
          subtitle={s.saldo >= 0 ? '✓ No positivo' : '⚠ No negativo'}
        />
        <StatCard title="Receitas" value={s.receitas} icon={TrendingUp}
          color="var(--success)" bg="var(--success-bg)"
          hideValues={hideValues} subtitle="Total do mês"
        />
        <StatCard title="Despesas" value={s.despesas} icon={TrendingDown}
          color="var(--danger)" bg="var(--danger-bg)"
          hideValues={hideValues} subtitle="Total do mês"
        />
        <StatCard title="A Pagar" value={s.pendentes} icon={Clock}
          color="var(--warning)" bg="var(--warning-bg)"
          hideValues={hideValues} subtitle="Pendentes"
        />
      </div>

      {/* Charts */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.2fr)', gap: 16, marginBottom: 24 }}>
        {/* Area Chart */}
        <div className="card">
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>Receitas × Despesas</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Últimos 6 meses</span>
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v, n) => [fmtCurrency(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
                  labelStyle={{ color: 'var(--text-secondary)' }} />
                <Area type="monotone" dataKey="receitas" stroke="#10B981" strokeWidth={2} fill="url(#gR)" />
                <Area type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={2} fill="url(#gD)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nenhum dado disponível</p>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3>Despesas por Categoria</h3>
          </div>
          {s.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={s.byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                  dataKey="value" labelLine={false} label={<CustomPieLabel />}>
                  {s.byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtCurrency(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AlertCircle size={32} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Sem despesas neste mês</p>
            </div>
          )}
          {/* Legend */}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
            {s.byCategory.slice(0,5).map((cat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{cat.name}</span>
                </div>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, flexShrink: 0 }}>{hideValues ? '•••' : fmtCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3>Últimos Lançamentos</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/despesas')} style={{ gap: 4 }}>
            Ver todos <ArrowRight size={14} />
          </button>
        </div>
        {recentList.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhum lançamento neste mês"
            message="Adicione sua primeira transação clicando no botão acima."
            action={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} />Adicionar</button>}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentList.map((t, i) => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < recentList.length - 1 ? '1px solid var(--border-subtle)' : 'none'
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 'var(--radius-md)',
                  background: t.type === 'receita' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {t.type === 'receita'
                    ? <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                    : <TrendingDown size={16} style={{ color: 'var(--danger)' }} />
                  }
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {t.categories?.name || 'Sem categoria'} • {format(new Date(t.date + 'T00:00:00'), 'dd/MM', { locale: ptBR })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Amount value={t.amount} type={t.type} hide={hideValues} />
                  <div style={{ marginTop: 2 }}><StatusBadge status={t.status} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionForm isOpen={addOpen} onClose={() => setAddOpen(false)} onSave={handleSave} />
    </div>
  )
}

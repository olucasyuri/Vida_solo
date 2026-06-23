import { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { fmtCurrency, PageHeader, LoadingPage } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function AnnualSummary() {
  const { user } = useAuth()
  const toast = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { data: rows } = await supabase
        .from('transactions')
        .select('type, amount, date, status')
        .eq('user_id', user.id)
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)

      const monthly = MONTHS.map((name, i) => {
        const m = i + 1
        const monthRows = (rows || []).filter(r => parseInt(r.date.slice(5, 7)) === m)
        const receitas = monthRows.filter(r => r.type === 'receita').reduce((s, r) => s + Number(r.amount), 0)
        const despesas = monthRows.filter(r => r.type === 'despesa').reduce((s, r) => s + Number(r.amount), 0)
        return { name, mes: m, receitas, despesas, saldo: receitas - despesas, total: monthRows.length }
      })
      setData(monthly)
      setLoading(false)
    }
    load()
  }, [user, year])

  const totalReceitas = data.reduce((s, m) => s + m.receitas, 0)
  const totalDespesas = data.reduce((s, m) => s + m.despesas, 0)
  const totalSaldo = totalReceitas - totalDespesas
  const melhorMes = [...data].sort((a, b) => b.saldo - a.saldo)[0]
  const piorMes = [...data].sort((a, b) => a.saldo - b.saldo)[0]
  const mediaReceitas = totalReceitas / 12
  const mediaDespesas = totalDespesas / 12

  // Export to PDF using print
  const handleExport = async () => {
    setExporting(true)
    try {
      // Build printable HTML
      const rows = data.map(m => `
        <tr>
          <td>${m.name}</td>
          <td style="color:#10B981">R$ ${m.receitas.toFixed(2).replace('.', ',')}</td>
          <td style="color:#EF4444">R$ ${m.despesas.toFixed(2).replace('.', ',')}</td>
          <td style="color:${m.saldo >= 0 ? '#10B981' : '#EF4444'};font-weight:bold">R$ ${m.saldo.toFixed(2).replace('.', ',')}</td>
        </tr>`).join('')

      const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Resumo Anual ${year}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 32px; }
  h1 { color: #6C47FF; margin-bottom: 4px; }
  .sub { color: #666; margin-bottom: 24px; font-size: 14px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .kpi { border: 1px solid #eee; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi-label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.05em; margin-bottom: 4px; }
  .kpi-value { font-size: 18px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #888; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  tr:last-child td { font-weight: bold; background: #f9f9f9; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head><body>
<h1>Vida Financeira</h1>
<div class="sub">Resumo Anual — ${year}</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Total Receitas</div><div class="kpi-value" style="color:#10B981">R$ ${totalReceitas.toFixed(2).replace('.', ',')}</div></div>
  <div class="kpi"><div class="kpi-label">Total Despesas</div><div class="kpi-value" style="color:#EF4444">R$ ${totalDespesas.toFixed(2).replace('.', ',')}</div></div>
  <div class="kpi"><div class="kpi-label">Saldo do Ano</div><div class="kpi-value" style="color:${totalSaldo >= 0 ? '#10B981' : '#EF4444'}">R$ ${totalSaldo.toFixed(2).replace('.', ',')}</div></div>
  <div class="kpi"><div class="kpi-label">Média Mensal</div><div class="kpi-value" style="color:#6C47FF">R$ ${mediaReceitas.toFixed(2).replace('.', ',')}</div></div>
</div>
<table>
<thead><tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Saldo</th></tr></thead>
<tbody>
${rows}
<tr><td><b>TOTAL</b></td><td style="color:#10B981"><b>R$ ${totalReceitas.toFixed(2).replace('.', ',')}</b></td><td style="color:#EF4444"><b>R$ ${totalDespesas.toFixed(2).replace('.', ',')}</b></td><td style="color:${totalSaldo >= 0 ? '#10B981' : '#EF4444'}"><b>R$ ${totalSaldo.toFixed(2).replace('.', ',')}</b></td></tr>
</tbody>
</table>
<div style="margin-top:24px;font-size:12px;color:#999;text-align:center">Gerado em ${new Date().toLocaleDateString('pt-BR')} — Vida Financeira</div>
</body></html>`

      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print() }, 500)
      toast.success('PDF aberto para impressão!')
    } catch (e) {
      toast.error('Erro ao gerar PDF')
    }
    setExporting(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="page-container">
      <PageHeader title="Resumo Anual" subtitle="Visão completa do seu ano financeiro"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={handleExport} disabled={exporting} style={{ gap: 6 }}>
              <Download size={16} /> {exporting ? 'Gerando...' : 'Exportar PDF'}
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Receitas', value: fmtCurrency(totalReceitas), color: 'var(--success)' },
          { label: 'Total Despesas', value: fmtCurrency(totalDespesas), color: 'var(--danger)' },
          { label: 'Saldo do Ano', value: fmtCurrency(totalSaldo), color: totalSaldo >= 0 ? 'var(--success)' : 'var(--danger)' },
          { label: 'Média Mensal (Receita)', value: fmtCurrency(mediaReceitas), color: 'var(--primary)' },
          { label: 'Média Mensal (Despesa)', value: fmtCurrency(mediaDespesas), color: 'var(--warning)' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {melhorMes && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>🏆 MELHOR MÊS</div>
            <div style={{ fontWeight: 700 }}>{melhorMes.name}</div>
            <div style={{ color: 'var(--success)', fontWeight: 800 }}>{fmtCurrency(melhorMes.saldo)}</div>
          </div>
          <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>⚠ MÊS MAIS DIFÍCIL</div>
            <div style={{ fontWeight: 700 }}>{piorMes.name}</div>
            <div style={{ color: 'var(--danger)', fontWeight: 800 }}>{fmtCurrency(piorMes.saldo)}</div>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16 }}>Receitas × Despesas — {year}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            <Tooltip formatter={(v, n) => [fmtCurrency(v), n === 'receitas' ? 'Receitas' : 'Despesas']}
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
              labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }} />
            <Bar dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3>Extrato Mensal</h3>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th style={{ textAlign: 'right' }}>Receitas</th>
                <th style={{ textAlign: 'right' }}>Despesas</th>
                <th style={{ textAlign: 'right' }}>Saldo</th>
                <th style={{ textAlign: 'center' }}>Lançamentos</th>
              </tr>
            </thead>
            <tbody>
              {data.map(m => (
                <tr key={m.name}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>{m.receitas > 0 ? fmtCurrency(m.receitas) : '—'}</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 600 }}>{m.despesas > 0 ? fmtCurrency(m.despesas) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: m.saldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {m.receitas === 0 && m.despesas === 0 ? '—' : fmtCurrency(m.saldo)}
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{m.total || '—'}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--bg-hover)' }}>
                <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>TOTAL</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>{fmtCurrency(totalReceitas)}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>{fmtCurrency(totalDespesas)}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: totalSaldo >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtCurrency(totalSaldo)}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{data.reduce((s, m) => s + m.total, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

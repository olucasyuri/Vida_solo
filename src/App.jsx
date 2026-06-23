import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Sidebar, BottomNav } from './components/Navigation'
import { TransactionForm } from './components/TransactionForm'
import { useTransactions } from './hooks/useFinance'
import { useToast } from './contexts/ToastContext'
import { useState } from 'react'

import Dashboard      from './pages/Dashboard'
import TransactionsList from './pages/TransactionsList'
import Categories     from './pages/Categories'
import Reports        from './pages/Reports'
import Settings       from './pages/Settings'
import Auth           from './pages/Auth'
import Debts          from './pages/Debts'
import Goals          from './pages/Goals'
import Shopping       from './pages/Shopping'
import AnnualSummary  from './pages/AnnualSummary'

function AppLoader() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #6C47FF, #8B6FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(108,71,255,0.5)', animation: 'pulse 2s ease infinite' }}>
        <span style={{ fontSize: '1.5rem', color: 'white', fontWeight: 800 }}>V</span>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Carregando...</div>
    </div>
  )
}

function QuickAdd({ open, onClose }) {
  const toast = useToast()
  const now = new Date()
  const { create } = useTransactions({ month: now.getMonth() + 1, year: now.getFullYear() })
  const handleSave = async (payload) => {
    const { error } = await create(payload)
    if (error) toast.error('Erro ao salvar: ' + error.message)
    else toast.success('Lançamento salvo!')
    onClose()
  }
  return <TransactionForm isOpen={open} onClose={onClose} onSave={handleSave} />
}

function ProtectedLayout() {
  const [addOpen, setAddOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/receitas"      element={<TransactionsList type="receita" title="Receitas" subtitle="Todas as suas entradas" />} />
          <Route path="/despesas"      element={<TransactionsList type="despesa" title="Despesas" subtitle="Todos os seus gastos" />} />
          <Route path="/a-pagar"       element={<TransactionsList type="despesa" title="A Pagar" subtitle="Contas pendentes" defaultStatus="pendente" />} />
          <Route path="/pagas"         element={<TransactionsList type={null} title="Pagas" subtitle="Lançamentos pagos" defaultStatus="pago" />} />
          <Route path="/metas"         element={<Goals />} />
          <Route path="/dividas"       element={<Debts />} />
          <Route path="/compras"       element={<Shopping />} />
          <Route path="/categorias"    element={<Categories />} />
          <Route path="/relatorios"    element={<Reports />} />
          <Route path="/resumo-anual"  element={<AnnualSummary />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav onAddClick={() => setAddOpen(true)} />
      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader />
  if (!user) return <Auth />
  return <Routes><Route path="/*" element={<ProtectedLayout />} /></Routes>
}

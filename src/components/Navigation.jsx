import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Tags,
  Clock, CheckCircle2, BarChart2, Settings, LogOut,
  TrendingDown, ShoppingCart, Target, CalendarRange, RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { section: 'Lançamentos' },
  { path: '/receitas',      icon: ArrowDownCircle, label: 'Receitas',        color: 'var(--success)' },
  { path: '/despesas',      icon: ArrowUpCircle,   label: 'Despesas',        color: 'var(--danger)'  },
  { path: '/fixos',         icon: RefreshCw,       label: 'Fixos / Recorrentes' },
  { section: 'Controle' },
  { path: '/a-pagar',       icon: Clock,           label: 'A Pagar',         color: 'var(--warning)' },
  { path: '/pagas',         icon: CheckCircle2,    label: 'Pagas',           color: 'var(--success)' },
  { section: 'Planejamento' },
  { path: '/metas',         icon: Target,          label: 'Metas'            },
  { path: '/dividas',       icon: TrendingDown,    label: 'Dívidas',         color: 'var(--danger)'  },
  { path: '/compras',       icon: ShoppingCart,    label: 'Lista de Compras' },
  { section: 'Relatórios' },
  { path: '/relatorios',    icon: BarChart2,       label: 'Relatórios'       },
  { path: '/resumo-anual',  icon: CalendarRange,   label: 'Resumo Anual'     },
  { section: 'Configurações' },
  { path: '/categorias',    icon: Tags,            label: 'Categorias'       },
  { path: '/configuracoes', icon: Settings,        label: 'Configurações'    },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const initials = name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()

  return (
    <aside className="sidebar">
      <div className="nav-logo">
        <div className="nav-logo-icon">V</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>Vida</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Financeira</div>
        </div>
      </div>

      <nav className="nav-items" style={{ overflowY: 'auto', flex: 1 }}>
        {navItems.map((item, i) => {
          if (item.section) return <div key={i} className="nav-section-label">{item.section}</div>
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button key={item.path} className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}>
              <Icon size={18} style={{ color: active ? 'var(--primary)' : item.color || 'currentColor', flexShrink: 0 }} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <button className="nav-item" onClick={() => navigate('/configuracoes')} style={{ gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-glow)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-light)', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </button>
        <button className="nav-item" onClick={async () => { await signOut(); toast.info('Saindo...') }}>
          <LogOut size={16} style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>Sair</span>
        </button>
      </div>
    </aside>
  )
}

const bottomItems = [
  { path: '/',         icon: LayoutDashboard, label: 'Início'   },
  { path: '/despesas', icon: ArrowUpCircle,   label: 'Despesas' },
  { path: '/receitas', icon: ArrowDownCircle, label: 'Receitas' },
  { path: '/fixos',    icon: RefreshCw,       label: 'Fixos'    },
  { path: '/relatorios', icon: BarChart2,     label: 'Mais'     },
]

export function BottomNav({ onAddClick }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-items">
        {bottomItems.map((item, i) => {
          if (i === 2) return (
            <div key="fab" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <button className="fab" onClick={onAddClick}><item.icon size={22} /></button>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          )
          const Icon = item.icon
          const active = pathname === item.path
          return (
            <button key={item.path} className={`bottom-nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
              <Icon size={22} />{item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

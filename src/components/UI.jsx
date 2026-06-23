import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Format Currency ───────────────────────────────────────────────────────
export function fmtCurrency(val, hide = false) {
  if (hide) return 'R$ ••••••'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
}

// ─── Loading Spinner ──────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin" style={{ color: 'var(--primary)' }} />
}

// ─── Loading Page ─────────────────────────────────────────────────────────
export function LoadingPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <Spinner size={32} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Carregando...</p>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirmar ação'}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner size={16} /> : 'Confirmar'}
        </button>
      </>}
    >
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </Modal>
  )
}

// ─── Month Selector ────────────────────────────────────────────────────────
export function MonthSelector({ value, onChange }) {
  const prev = () => onChange(subMonths(value, 1))
  const next = () => {
    const n = addMonths(value, 1)
    if (n <= new Date()) onChange(n)
  }
  const label = format(value, 'MMMM yyyy', { locale: ptBR })
  const isCurrentMonth = format(value, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="month-selector">
      <button onClick={prev}><ChevronLeft size={16} /></button>
      <span style={{ textTransform: 'capitalize' }}>{label}</span>
      <button onClick={next} disabled={isCurrentMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
export function SkeletonCard({ height = 100 }) {
  return <div className="skeleton" style={{ height, borderRadius: 'var(--radius-lg)' }} />
}

// ─── Category Dot ─────────────────────────────────────────────────────────
export function CategoryDot({ color, name, size = 10 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      {name}
    </span>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pago:      { label: 'Pago',      cls: 'badge-success' },
    pendente:  { label: 'Pendente',  cls: 'badge-warning' },
    cancelado: { label: 'Cancelado', cls: 'badge-muted'   },
  }
  const { label, cls } = map[status] || map.pago
  return <span className={`badge ${cls}`}>{label}</span>
}

// ─── Empty State ──────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} />}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
      <div>
        <h2 style={{ marginBottom: 2 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: '0.875rem' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Amount Display ────────────────────────────────────────────────────────
export function Amount({ value, type, hide }) {
  if (hide) return <span className="amount-neutral">{fmtCurrency(value, true)}</span>
  if (type === 'receita') return <span className="amount-positive">+{fmtCurrency(value)}</span>
  if (type === 'despesa') return <span className="amount-negative">-{fmtCurrency(value)}</span>
  const cls = value >= 0 ? 'amount-positive' : 'amount-negative'
  return <span className={cls}>{fmtCurrency(value)}</span>
}

// ─── Page Header ──────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '0.9rem' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  )
}

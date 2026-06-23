import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Spinner } from '../components/UI'
import { Mail, Lock, User, Eye, EyeOff, TrendingUp } from 'lucide-react'

export default function Auth() {
  const [mode, setMode] = useState('login') // login | register | forgot
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const { signIn, signUp, resetPassword } = useAuth()
  const toast = useToast()

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'E-mail inválido'
    if (mode !== 'forgot') {
      if (!form.password || form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    }
    if (mode === 'register') {
      if (!form.name.trim()) e.name = 'Informe seu nome'
      if (form.password !== form.confirm) e.confirm = 'Senhas não coincidem'
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)

    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message)
      }
    } else if (mode === 'register') {
      const { error } = await signUp(form.email, form.password, form.name)
      if (error) toast.error(error.message)
      else toast.success('Conta criada! Verifique seu e-mail.')
    } else {
      const { error } = await resetPassword(form.email)
      if (error) toast.error(error.message)
      else { toast.success('E-mail de recuperação enviado!'); setMode('login') }
    }
    setLoading(false)
  }

  const titles = {
    login: { h: 'Bem-vindo de volta', sub: 'Entre na sua conta para continuar' },
    register: { h: 'Criar conta', sub: 'Comece a controlar suas finanças hoje' },
    forgot: { h: 'Recuperar senha', sub: 'Enviaremos um link para seu e-mail' }
  }
  const { h, sub } = titles[mode]

  return (
    <div className="auth-page">
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 60, height: 60,
          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
          borderRadius: 16,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 800, color: 'white',
          boxShadow: '0 8px 24px rgba(108,71,255,0.5)',
          marginBottom: 12
        }}>
          <TrendingUp size={28} />
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>Vida Financeira</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>Seu controle financeiro pessoal</div>
      </div>

      <div className="auth-card">
        <h2 style={{ marginBottom: 4, textAlign: 'center' }}>{h}</h2>
        <p style={{ textAlign: 'center', fontSize: '0.875rem', marginBottom: 28 }}>{sub}</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Nome completo <span>*</span></label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className={`form-input ${errors.name ? 'error' : ''}`} style={{ paddingLeft: 36 }}
                  type="text" placeholder="Seu nome" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className={`form-input ${errors.email ? 'error' : ''}`} style={{ paddingLeft: 36 }}
                type="email" placeholder="seu@email.com" value={form.email}
                onChange={e => set('email', e.target.value)}
                autoComplete={mode === 'login' ? 'email' : 'new-email'} />
            </div>
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Senha <span>*</span></label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className={`form-input ${errors.password ? 'error' : ''}`} style={{ paddingLeft: 36, paddingRight: 40 }}
                  type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Confirmar senha <span>*</span></label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className={`form-input ${errors.confirm ? 'error' : ''}`} style={{ paddingLeft: 36 }}
                  type="password" placeholder="••••••••" value={form.confirm}
                  onChange={e => set('confirm', e.target.value)} autoComplete="new-password" />
              </div>
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -6 }}>
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => setMode('forgot')} style={{ color: 'var(--primary-light)', fontSize: '0.8125rem' }}>
                Esqueceu a senha?
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <Spinner size={18} /> : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar Conta' : 'Enviar Link'}
          </button>
        </form>

        <div className="divider" style={{ margin: '20px 0' }} />

        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {mode === 'login' ? (
            <>Não tem conta?{' '}
              <button className="btn btn-ghost btn-sm" onClick={() => setMode('register')} style={{ color: 'var(--primary-light)', padding: '2px 6px' }}>
                Criar grátis
              </button>
            </>
          ) : (
            <>Já tem conta?{' '}
              <button className="btn btn-ghost btn-sm" onClick={() => setMode('login')} style={{ color: 'var(--primary-light)', padding: '2px 6px' }}>
                Entrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

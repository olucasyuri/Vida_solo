import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Spinner, PageHeader } from '../components/UI'
import { User, Lock, Bell, Shield, Smartphone, LogOut, Moon } from 'lucide-react'

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} style={{ color: 'var(--primary-light)' }} />
        </div>
        <h3 style={{ fontSize: '0.9375rem' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const toast = useToast()

  const [profile, setProfile] = useState({ name: '', email: '' })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdErrors, setPwdErrors] = useState({})

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.user_metadata?.name || '',
        email: user.email || ''
      })
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) { toast.error('Informe seu nome'); return }
    setSavingProfile(true)
    const { error } = await supabase.auth.updateUser({ data: { name: profile.name } })
    // Also update profiles table
    await supabase.from('profiles').upsert({ id: user.id, name: profile.name })
    if (error) toast.error('Erro ao salvar perfil')
    else toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  const handleSavePassword = async () => {
    const e = {}
    if (!passwords.next) e.next = 'Informe a nova senha'
    else if (passwords.next.length < 6) e.next = 'Mínimo 6 caracteres'
    if (passwords.next !== passwords.confirm) e.confirm = 'Senhas não coincidem'
    if (Object.keys(e).length) { setPwdErrors(e); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.next })
    if (error) toast.error('Erro ao alterar senha: ' + error.message)
    else { toast.success('Senha alterada com sucesso!'); setPasswords({ current: '', next: '', confirm: '' }) }
    setSavingPwd(false)
    setPwdErrors({})
  }

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'
  const initials = name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()

  return (
    <div className="page-container">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e preferências" />

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 800, color: 'white',
          boxShadow: '0 4px 14px rgba(108,71,255,0.4)'
        }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{name}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</div>
          <div style={{ marginTop: 4 }}>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>✓ Conta ativa</span>
          </div>
        </div>
      </div>

      {/* Profile */}
      <Section icon={User} title="Informações Pessoais">
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nome completo</label>
            <input className="form-input" value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder="Seu nome" />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" value={profile.email} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>O e-mail não pode ser alterado por aqui</span>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <Spinner size={16} /> : 'Salvar Perfil'}
          </button>
        </div>
      </Section>

      {/* Password */}
      <Section icon={Lock} title="Alterar Senha">
        <div className="form-grid" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Nova senha <span>*</span></label>
            <input className={`form-input ${pwdErrors.next ? 'error' : ''}`}
              type="password" placeholder="Mínimo 6 caracteres"
              value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} />
            {pwdErrors.next && <span className="form-error">{pwdErrors.next}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar senha <span>*</span></label>
            <input className={`form-input ${pwdErrors.confirm ? 'error' : ''}`}
              type="password" placeholder="Repita a nova senha"
              value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
            {pwdErrors.confirm && <span className="form-error">{pwdErrors.confirm}</span>}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleSavePassword} disabled={savingPwd}>
            {savingPwd ? <Spinner size={16} /> : 'Alterar Senha'}
          </button>
        </div>
      </Section>

      {/* PWA Install */}
      <Section icon={Smartphone} title="Instalar como App">
        <p style={{ fontSize: '0.875rem', marginBottom: 12 }}>
          Instale o Vida Financeira na tela inicial do seu celular para acesso rápido, como um aplicativo nativo.
        </p>
        <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>Como instalar:</strong>
          <span style={{ display: 'block' }}>📱 <strong>Android (Chrome):</strong> Menu (⋮) → "Adicionar à tela inicial"</span>
          <span style={{ display: 'block' }}>🍎 <strong>iPhone (Safari):</strong> Compartilhar (□↑) → "Adicionar à Tela de Início"</span>
          <span style={{ display: 'block' }}>💻 <strong>Desktop (Chrome):</strong> Ícone de instalação na barra de endereço</span>
        </div>
      </Section>

      {/* Security */}
      <Section icon={Shield} title="Segurança">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Seus dados</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Todos os dados são armazenados com segurança no Supabase</div>
            </div>
            <span className="badge badge-success">✓ Seguro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Criptografia</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Comunicação protegida por SSL/TLS</div>
            </div>
            <span className="badge badge-success">✓ HTTPS</span>
          </div>
        </div>
      </Section>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <h3 style={{ marginBottom: 8, color: 'var(--danger)' }}>Sair da conta</h3>
        <p style={{ fontSize: '0.875rem', marginBottom: 16 }}>Você será desconectado e precisará fazer login novamente.</p>
        <button className="btn btn-danger" onClick={signOut} style={{ gap: 8 }}>
          <LogOut size={16} /> Sair da Conta
        </button>
      </div>
    </div>
  )
}

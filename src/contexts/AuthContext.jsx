import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      return await supabase.auth.signInWithPassword({ email, password })
    } catch (e) {
      return { error: { message: 'Erro de conexão. Verifique suas configurações do Supabase.' } }
    }
  }

  const signUp = async (email, password, name) => {
    try {
      return await supabase.auth.signUp({
        email, password,
        options: { data: { name } }
      })
    } catch (e) {
      return { error: { message: 'Erro de conexão. Verifique suas configurações do Supabase.' } }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {})
    setUser(null)
  }

  const resetPassword = async (email) => {
    try {
      return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
    } catch (e) {
      return { error: { message: 'Erro ao enviar e-mail.' } }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

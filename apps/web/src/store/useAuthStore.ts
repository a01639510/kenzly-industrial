import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { bridgeApiLogin, setApiToken } from '@/lib/apiClient'

interface AuthState {
  user:     User | null
  loading:  boolean
  error:    string | null
  apiToken: string | null
  signIn:   (email: string, password: string) => Promise<void>
  signOut:  () => Promise<void>
}

async function acquireApiToken(): Promise<string | null> {
  const token = await bridgeApiLogin()
  setApiToken(token)
  return token
}

export const useAuthStore = create<AuthState>(set => {
  // Resolve the initial session; onAuthStateChange fires INITIAL_SESSION async
  // so we call getSession() directly to avoid a race where loading stays true.
  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) console.error('[auth] getSession error:', error.message)
    const supabaseUser = data.session?.user ?? null
    const apiToken = supabaseUser ? await acquireApiToken() : null
    set({ user: supabaseUser, apiToken, loading: false })
  }).catch(err => {
    console.error('[auth] getSession threw:', err)
    set({ loading: false })
  })

  // Sync on sign-in / sign-out / token refresh — loading already resolved
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ user: session?.user ?? null })
  })

  return {
    user:     null,
    loading:  true,
    error:    null,
    apiToken: null,

    signIn: async (email, password) => {
      set({ error: null })
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { set({ error: error.message }); return }
      const apiToken = await acquireApiToken()
      set({ apiToken })
    },

    signOut: async () => {
      await supabase.auth.signOut()
      setApiToken(null)
      set({ user: null, apiToken: null, error: null })
    },
  }
})

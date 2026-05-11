import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user:    User | null
  loading: boolean
  error:   string | null
  signIn:  (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>(set => {
  // Resolve the initial session; onAuthStateChange fires INITIAL_SESSION async
  // so we call getSession() directly to avoid a race where loading stays true.
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) console.error('[auth] getSession error:', error.message)
    set({ user: data.session?.user ?? null, loading: false })
  }).catch(err => {
    console.error('[auth] getSession threw:', err)
    set({ loading: false })
  })

  // Sync on sign-in / sign-out / token refresh
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ user: session?.user ?? null })
  })

  return {
    user:    null,
    loading: true,
    error:   null,

    signIn: async (email, password) => {
      set({ error: null })
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) set({ error: error.message })
    },

    signOut: async () => {
      await supabase.auth.signOut()
      set({ user: null, error: null })
    },
  }
})

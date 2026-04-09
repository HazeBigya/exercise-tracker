import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface UseAuthResult {
  session: Session | null
  authLoading: boolean
  authMessage: string
  isSupabaseConfigured: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState<string>(
    isSupabaseConfigured
      ? 'Guest mode is active — sign in anytime to connect your account.'
      : 'Guest mode is active — add Supabase env vars to enable Google sign-in.',
  )

  useEffect(() => {
    let isMounted = true

    if (!supabase) {
      return undefined
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setAuthMessage(error.message)
      }

      setSession(data.session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setAuthLoading(false)
      setAuthMessage(
        nextSession?.user?.email
          ? 'Account connected.'
          : 'Guest mode is active — the timer stays fully usable without login.',
      )
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setAuthMessage(
        'Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable Google sign-in.',
      )
      return
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setAuthMessage(error.message)
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      return
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthMessage(error.message)
    }
  }, [])

  return {
    session,
    authLoading,
    authMessage,
    isSupabaseConfigured,
    signInWithGoogle,
    signOut,
  }
}

export default useAuth

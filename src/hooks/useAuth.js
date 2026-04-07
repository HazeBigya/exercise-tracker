import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function useAuth() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured)
  const [authMessage, setAuthMessage] = useState(
    isSupabaseConfigured
      ? 'Guest mode is active — sign in anytime to connect your account.'
      : 'Guest mode is active — add Supabase env vars to enable Google sign-in.',
  )

  useEffect(() => {
    let isMounted = true

    if (!supabase) {
      return undefined
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setAuthMessage(error.message)
      }

      setSession(data?.session ?? null)
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
        redirectTo: window.location.origin,
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

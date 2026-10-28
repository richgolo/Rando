import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Keeps track of who is signed in (session) and their FarmHaul profile (role, name, phone, area).
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still checking
  // Remember WHICH user the loaded profile belongs to, so we know when it is stale.
  const [loaded, setLoaded] = useState({ userId: null, profile: null })

  const loadProfile = useCallback(async (userId) => {
    if (!userId) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setLoaded({ userId, profile: data })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadProfile(data.session?.user.id)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // Don't await Supabase calls inside this callback (it can deadlock); defer instead.
      setTimeout(() => loadProfile(newSession?.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const userId = session?.user.id ?? null
  const profileReady = !userId || loaded.userId === userId

  const value = {
    session,
    user: session?.user ?? null,
    profile: userId && loaded.userId === userId ? loaded.profile : null,
    loading: session === undefined || !profileReady,
    refreshProfile: () => loadProfile(userId),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

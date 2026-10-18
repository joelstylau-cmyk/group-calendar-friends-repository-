import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSupabase } from './supabase'

const UserContext = createContext<User | null>(null)

// Eingeloggter User. Nur innerhalb von <AuthGate> verwenden, dort ist er garantiert gesetzt.
export function useUser(): User {
  const user = useContext(UserContext)
  if (!user) throw new Error('useUser() außerhalb von <AuthGate> aufgerufen')
  return user
}

// Google-Name als Vorschlag für den Anzeigenamen in einer Gruppe
export function displayNameOf(user: User): string {
  const meta = user.user_metadata as { full_name?: string; name?: string }
  return (meta.full_name ?? meta.name ?? '').trim()
}

export async function signInWithGoogle(): Promise<string | null> {
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    // Zurück auf genau die Seite, auf der man war (inkl. ?r=…). Muss in Supabase
    // unter Redirect URLs erlaubt sein, sonst landet man auf der Site URL.
    options: { redirectTo: window.location.href },
  })
  return error?.message ?? null
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut()
}

// Rendert die Kinder nur mit gültiger Session, sonst den Login-Screen.
export function AuthGate({ login, children }: { login: ReactNode; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getSupabase().auth
    // getSession wartet auch auf den Code-Austausch nach der Rückkehr von Google.
    void auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) {
    return <main className="mx-auto max-w-md px-4 py-16 text-center text-gray-500">Lade…</main>
  }
  if (!session) return <>{login}</>
  return <UserContext.Provider value={session.user}>{children}</UserContext.Provider>
}

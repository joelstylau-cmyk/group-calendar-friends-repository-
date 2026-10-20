import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { displayNameOf, useUser } from './auth'
import { getSupabase } from './supabase'
import { applyTheme, storedTheme } from './theme'
import type { OwnProfile } from './types'

interface ProfileState {
  profile: OwnProfile
  // false, solange das Profil noch nicht aus der Datenbank geladen ist
  loaded: boolean
  save: (changes: Partial<OwnProfile>) => Promise<string | null>
}

const ProfileContext = createContext<ProfileState | null>(null)

// Eigenes Profil. Nur innerhalb von <ProfileProvider> verwenden.
export function useProfile(): ProfileState {
  const state = useContext(ProfileContext)
  if (!state) throw new Error('useProfile() außerhalb von <ProfileProvider> aufgerufen')
  return state
}

// Lädt das eigene Profil (legt die Datenbank beim ersten Login per Trigger an)
// und hält es per Realtime aktuell, z.B. wenn es auf einem anderen Gerät geändert wird.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const user = useUser()
  // Bis zum Laden: Google-Name als Platzhalter
  const [profile, setProfile] = useState<OwnProfile>(() => ({
    name: displayNameOf(user) || 'Ich',
    emoji: null,
    color: null,
    theme: storedTheme(),
  }))
  const [loaded, setLoaded] = useState(false)

  const reload = useCallback(async () => {
    const { data } = await getSupabase().from('profiles').select('name, emoji, color, theme').eq('id', user.id).maybeSingle()
    if (data) setProfile(data as OwnProfile)
    setLoaded(true)
  }, [user.id])

  useEffect(() => {
    const supabase = getSupabase()
    void reload()
    const channel = supabase
      .channel(`profile:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () =>
        void reload(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void reload()
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user.id, reload])

  // Wahl aus dem Profil gewinnt (z.B. auf einem anderen Gerät geändert) und wird lokal gespiegelt
  useEffect(() => {
    if (loaded) applyTheme(profile.theme)
  }, [loaded, profile.theme])

  const save = useCallback(
    async (changes: Partial<OwnProfile>) => {
      const { error } = await getSupabase()
        .from('profiles')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) return error.message
      await reload()
      return null
    },
    [user.id, reload],
  )

  return <ProfileContext.Provider value={{ profile, loaded, save }}>{children}</ProfileContext.Provider>
}

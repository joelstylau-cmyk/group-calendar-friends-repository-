import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import type { Member } from '../lib/types'

interface MembersState {
  members: Member[]
  loaded: boolean
  error: string | null
  reload: () => Promise<void>
}

// Lädt die Mitglieder einer Gruppe und hält sie per Realtime aktuell.
export function useMembers(slug: string): MembersState {
  const [members, setMembers] = useState<Member[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from('members')
      .select('*')
      .eq('group_slug', slug)
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setMembers(data as Member[])
    }
    setLoaded(true)
  }, [slug])

  useEffect(() => {
    const supabase = getSupabase()
    void reload()

    // Bei jeder Änderung neu laden: einfacher und robuster als Einzel-Events
    // zusammenzuführen, und bei Freundeskreis-Größe billig.
    // Zusätzlich neu laden, sobald das Abo (wieder) steht: Änderungen zwischen
    // erstem Laden und fertigem Abo oder während eines Verbindungsabbruchs
    // kämen sonst nie an.
    const channel = supabase
      .channel(`members:${slug}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `group_slug=eq.${slug}` },
        () => void reload(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void reload()
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [slug, reload])

  return { members, loaded, error, reload }
}

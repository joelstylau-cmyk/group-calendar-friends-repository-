import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

// Beitritts-Code der Gruppe, nur für Mitglieder lesbar (groups ist nur für sie freigegeben).
export function useJoinCode(groupSlug: string) {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSupabase()
      .from('groups')
      .select('join_code')
      .eq('slug', groupSlug)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setCode(data.join_code as string)
      })
    return () => {
      cancelled = true
    }
  }, [groupSlug])

  return { code, error }
}

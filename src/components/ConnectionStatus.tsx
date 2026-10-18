import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Status = 'checking' | 'ok' | 'error' | 'unconfigured'

export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>(isSupabaseConfigured ? 'checking' : 'unconfigured')
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!supabase) return
    // Ruft den Auth-Health-Endpoint auf, funktioniert ohne Tabellen.
    const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } })
      .then((res) => {
        if (res.ok) setStatus('ok')
        else {
          setStatus('error')
          setDetail(`HTTP ${res.status}`)
        }
      })
      .catch((err: Error) => {
        setStatus('error')
        setDetail(err.message)
      })
  }, [])

  const label = {
    checking: 'Supabase: prüfe Verbindung…',
    ok: 'Supabase: verbunden',
    error: `Supabase: Fehler${detail ? ` (${detail})` : ''}`,
    unconfigured: 'Supabase: .env fehlt (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)',
  }[status]

  const color = {
    checking: 'text-gray-500',
    ok: 'text-green-700',
    error: 'text-rose-700',
    unconfigured: 'text-amber-700',
  }[status]

  return <p className={`text-sm ${color}`}>{label}</p>
}

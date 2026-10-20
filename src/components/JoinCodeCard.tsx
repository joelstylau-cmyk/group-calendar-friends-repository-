import { useEffect, useState } from 'react'
import { copyText } from '../lib/clipboard'
import { formatJoinCode } from '../lib/joinCode'
import { getSupabase } from '../lib/supabase'

// Beitritts-Code der Gruppe, nur für Mitglieder (groups ist nur für sie lesbar).
export default function JoinCodeCard({ groupSlug }: { groupSlug: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

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

  async function handleCopy() {
    if (!code) return
    setCopyState((await copyText(formatJoinCode(code))) ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 2000)
  }

  if (error) return <p className="text-sm text-rose-700">Beitritts-Code laden fehlgeschlagen: {error}</p>

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">Beitritts-Code</p>
        <p className="font-mono text-lg font-semibold tracking-widest">{code ? formatJoinCode(code) : '…'}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!code}
        className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {copyState === 'copied' ? '✓ Kopiert' : copyState === 'failed' ? 'Fehlgeschlagen' : 'Kopieren'}
      </button>
    </div>
  )
}

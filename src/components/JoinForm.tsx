import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { useProfile } from '../lib/profile'
import { getSupabase, UNIQUE_VIOLATION } from '../lib/supabase'
import Avatar from './Avatar'

interface Props {
  groupSlug: string
  groupName: string
  onJoined: () => void
}

// Beitreten mit dem globalen Profil; Name/Emoji/Farbe gibt es nur noch in den Settings.
export default function JoinForm({ groupSlug, groupName, onJoined }: Props) {
  const user = useUser()
  const { profile } = useProfile()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    setBusy(true)
    setError(null)
    // user_id und role setzt die Datenbank (Default auth.uid() bzw. 'member').
    const { error } = await getSupabase().from('members').insert({ group_slug: groupSlug })
    setBusy(false)
    // Schon Mitglied (z.B. Doppelklick oder zweiter Tab): einfach weiter.
    if (error && error.code !== UNIQUE_VIOLATION) {
      setError(`Beitreten hat nicht geklappt: ${error.message}`)
      return
    }
    onJoined()
  }

  return (
    <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Willkommen bei „{groupName}“</h2>
        <p className="text-sm text-muted">Du trittst so bei:</p>
      </div>

      <div className="flex items-center gap-3">
        <Avatar member={{ user_id: user.id, ...profile }} size={44} />
        <div className="min-w-0">
          <p className="truncate font-medium">{profile.name}</p>
          <Link to="/settings" className="text-sm text-accent underline">
            In den Einstellungen ändern
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-no">{error}</p>}

      <button
        type="button"
        onClick={handleJoin}
        disabled={busy}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-on-accent disabled:opacity-50"
      >
        {busy ? 'Trete bei…' : 'Beitreten'}
      </button>
    </div>
  )
}

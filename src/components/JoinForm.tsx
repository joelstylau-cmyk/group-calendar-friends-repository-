import { useState, type FormEvent } from 'react'
import { displayNameOf, useUser } from '../lib/auth'
import { colorForId } from '../lib/colors'
import { getSupabase, UNIQUE_VIOLATION } from '../lib/supabase'

const EMOJIS = ['😎', '🦊', '🐸', '🐼', '🦄', '🐙', '🌻', '🍕', '⚽', '🎸', '🚲', '🌊']

interface Props {
  groupSlug: string
  groupName: string
  onJoined: () => void
}

export default function JoinForm({ groupSlug, groupName, onJoined }: Props) {
  const user = useUser()
  const [name, setName] = useState(() => displayNameOf(user).slice(0, 30))
  const [emoji, setEmoji] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    // user_id und role setzt die Datenbank (Default auth.uid() bzw. 'member').
    const { error } = await getSupabase()
      .from('members')
      .insert({ group_slug: groupSlug, name: trimmed, emoji, color: colorForId(user.id) })
    setBusy(false)
    // Schon Mitglied (z.B. Doppelklick oder zweiter Tab): einfach weiter.
    if (error && error.code !== UNIQUE_VIOLATION) {
      setError(`Beitreten hat nicht geklappt: ${error.message}`)
      return
    }
    onJoined()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Willkommen bei „{groupName}“</h2>
        <p className="text-sm text-gray-600">Wie sollen dich die anderen sehen?</p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Dein Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          required
          autoFocus
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-[#5b6cff] focus:ring-2 focus:ring-[#5b6cff]/30"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Emoji (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(emoji === e ? null : e)}
              aria-pressed={emoji === e}
              className={`h-10 w-10 rounded-full text-xl transition ${
                emoji === e ? 'bg-[#5b6cff]/15 ring-2 ring-[#5b6cff]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full rounded-lg bg-[#5b6cff] px-4 py-2.5 font-medium text-white disabled:opacity-50"
      >
        {busy ? 'Trete bei…' : 'Beitreten'}
      </button>
    </form>
  )
}

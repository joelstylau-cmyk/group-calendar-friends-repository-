import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { signOut, useUser } from '../lib/auth'
import { colorForId, MEMBER_COLORS } from '../lib/colors'
import { EMOJIS } from '../lib/emojis'
import { useProfile } from '../lib/profile'

export default function Settings() {
  const { loaded } = useProfile()
  // Formular erst mit geladenem Profil zeigen, damit es mit den echten Werten startet
  if (!loaded) return <main className="mx-auto max-w-md px-4 py-16 text-center text-gray-500">Lade…</main>
  return <SettingsForm />
}

function SettingsForm() {
  const user = useUser()
  const { profile, save } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()

  const [name, setName] = useState(profile.name)
  const [emoji, setEmoji] = useState(profile.emoji)
  const [color, setColor] = useState(profile.color)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const trimmed = name.trim()
  const dirty = trimmed !== profile.name || emoji !== profile.emoji || color !== profile.color
  const autoColor = colorForId(user.id)

  function goBack() {
    // Direkt aufgerufen (kein Verlauf in der App): zur Startseite
    if (location.key === 'default') navigate('/')
    else navigate(-1)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!trimmed || !dirty) return
    setBusy(true)
    setMessage(null)
    const error = await save({ name: trimmed, emoji, color })
    setBusy(false)
    setMessage(error ? { kind: 'error', text: `Speichern hat nicht geklappt: ${error}` } : { kind: 'ok', text: '✓ gespeichert' })
  }

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 py-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Zurück"
          className="-ml-2 rounded-full px-3 py-1 text-xl text-gray-600 hover:bg-gray-100"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar member={{ user_id: user.id, name: trimmed || '?', emoji, color }} size={56} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{trimmed || 'Ohne Namen'}</p>
            <p className="text-sm text-gray-500">So sehen dich die anderen in allen Gruppen.</p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-[#5b6cff] focus:ring-2 focus:ring-[#5b6cff]/30"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Emoji</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEmoji(null)}
              aria-pressed={emoji === null}
              className={`h-10 rounded-full px-3 text-sm ${
                emoji === null ? 'bg-[#5b6cff]/15 ring-2 ring-[#5b6cff]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Keins
            </button>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                aria-label={`Emoji ${e}`}
                className={`h-10 w-10 rounded-full text-xl ${
                  emoji === e ? 'bg-[#5b6cff]/15 ring-2 ring-[#5b6cff]' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Farbe</legend>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setColor(null)}
              aria-pressed={color === null}
              className={`flex h-10 items-center gap-2 rounded-full pr-3 pl-1.5 text-sm ${
                color === null ? 'bg-[#5b6cff]/15 ring-2 ring-[#5b6cff]' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className="h-7 w-7 rounded-full" style={{ backgroundColor: autoColor }} />
              Automatisch
            </button>
            {MEMBER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                aria-label={`Farbe ${c}`}
                className={`h-10 w-10 rounded-full ring-offset-2 ${color === c ? 'ring-2 ring-gray-800' : ''}`}
                style={{ backgroundColor: c }}
              >
                {color === c && <span className="font-bold text-white">✓</span>}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || !trimmed || !dirty}
            className="rounded-lg bg-[#5b6cff] px-5 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Speichere…' : 'Speichern'}
          </button>
          {message && (
            <span className={`text-sm ${message.kind === 'ok' ? 'text-emerald-700' : 'text-rose-700'}`} aria-live="polite">
              {message.text}
            </span>
          )}
        </div>
      </form>

      <section className="space-y-2 border-t border-gray-200 pt-6">
        <p className="text-sm text-gray-500">Angemeldet mit Google als {user.email}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Abmelden
        </button>
      </section>
    </main>
  )
}

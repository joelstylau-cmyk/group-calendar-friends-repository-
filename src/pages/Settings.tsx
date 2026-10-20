import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { signOut, useUser } from '../lib/auth'
import { colorForId, MEMBER_COLORS } from '../lib/colors'
import { EMOJIS } from '../lib/emojis'
import { useProfile } from '../lib/profile'
import { applyTheme, THEME_OPTIONS, type ThemePref } from '../lib/theme'

export default function Settings() {
  const { loaded } = useProfile()
  // Formular erst mit geladenem Profil zeigen, damit es mit den echten Werten startet
  if (!loaded) return <main className="mx-auto max-w-md px-4 py-16 text-center text-muted">Lade…</main>
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
  const [signingOut, setSigningOut] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [themeError, setThemeError] = useState<string | null>(null)
  // Gewählt, aber noch nicht gespeichert: sofort markieren
  const [pendingTheme, setPendingTheme] = useState<ThemePref | null>(null)
  const currentTheme = pendingTheme ?? profile.theme

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

  // Sofort anwenden und speichern; unabhängig vom Profil-Formular
  async function handleTheme(theme: ThemePref) {
    applyTheme(theme)
    setPendingTheme(theme)
    setThemeError(null)
    const error = await save({ theme })
    setPendingTheme(null)
    if (error) {
      applyTheme(profile.theme)
      setThemeError(`Darstellung speichern hat nicht geklappt: ${error}`)
    }
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Zurück"
          className="-ml-2 rounded-full px-3 py-1 text-xl text-muted hover:bg-surface-2"
        >
          ←
        </button>
        <h1 className="text-display">Einstellungen</h1>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-6 p-5">
        <div className="flex items-center gap-3">
          <Avatar member={{ user_id: user.id, name: trimmed || '?', emoji, color }} size={56} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{trimmed || 'Ohne Namen'}</p>
            <p className="text-sm text-muted">So sehen dich die anderen in allen Gruppen.</p>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            className="field"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-label">Emoji</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEmoji(null)}
              aria-pressed={emoji === null}
              className={`h-10 rounded-full px-3 text-sm ${
                emoji === null ? 'bg-accent/15 ring-2 ring-accent' : 'bg-surface-2 hover:bg-line'
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
                  emoji === e ? 'bg-accent/15 ring-2 ring-accent' : 'bg-surface-2 hover:bg-line'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-label">Farbe</legend>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setColor(null)}
              aria-pressed={color === null}
              className={`flex h-10 items-center gap-2 rounded-full pr-3 pl-1.5 text-sm ${
                color === null ? 'bg-accent/15 ring-2 ring-accent' : 'bg-surface-2 hover:bg-line'
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
                className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-surface ${color === c ? 'ring-2 ring-ink' : ''}`}
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
            className="btn btn-primary"
          >
            {busy ? 'Speichere…' : 'Speichern'}
          </button>
          {message && (
            <span className={`text-sm ${message.kind === 'ok' ? 'text-yes' : 'text-no-ink'}`} aria-live="polite">
              {message.text}
            </span>
          )}
        </div>
      </form>

      <section className="card space-y-3 p-5" aria-labelledby="theme-title">
        <h2 id="theme-title" className="text-h2">
          Darstellung
        </h2>
        <div className="segmented" role="group" aria-label="Darstellung">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={currentTheme === o.value}
              onClick={() => void handleTheme(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-small text-muted">„Automatisch“ folgt der Einstellung deines Geräts. Gilt auf allen deinen Geräten.</p>
        {themeError && <p className="text-sm text-no-ink">{themeError}</p>}
      </section>

      <section className="card space-y-3 p-5">
        <p className="text-small text-muted">Angemeldet mit Google als {user.email}</p>
        <button
          type="button"
          onClick={() => {
            setSigningOut(true)
            void signOut()
          }}
          disabled={signingOut}
          className="btn btn-secondary"
        >
          {signingOut ? 'Melde ab…' : 'Abmelden'}
        </button>
      </section>
    </main>
  )
}

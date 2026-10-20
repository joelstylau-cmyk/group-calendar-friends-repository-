import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConnectionStatus from '../components/ConnectionStatus'
import { useMyGroups } from '../hooks/useMyGroups'
import { useUser } from '../lib/auth'
import { checkJoinCode, JOIN_CODE_RATE_LIMITED, normalizeJoinCode } from '../lib/joinCode'
import { createSlug } from '../lib/slug'
import { getSupabase, UNIQUE_VIOLATION } from '../lib/supabase'

// Startseite nach dem Login: eigene Gruppen plus neue Gruppe anlegen.
export default function Start() {
  const userId = useUser().id
  const { groups, loaded, error } = useMyGroups(userId)

  return (
    <main className="mx-auto max-w-md space-y-8 px-4 py-6">
      <header className="space-y-2">
        <h1 className="text-display">Gruppenkalender</h1>
        <p className="text-muted">Termin mit Freunden finden.</p>
      </header>

      <section aria-label="Deine Gruppen" className="space-y-3">
        <h2 className="text-label">Deine Gruppen</h2>
        {error && <p className="text-sm text-no">Gruppen laden fehlgeschlagen: {error}</p>}
        {!loaded ? (
          <p className="text-muted">Lade Gruppen…</p>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-faint/50 p-5 text-center text-sm text-muted">
            <p className="text-3xl">👋</p>
            <p className="mt-2 font-medium text-ink">Du bist noch in keiner Gruppe</p>
            <p className="mt-1">
              Leg unten eine neue Gruppe an und teil den Link. Oder lass dir den Link oder Beitritts-Code einer
              bestehenden Gruppe schicken.
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {groups.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/g/${g.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper"
                >
                  <span className="min-w-0 truncate font-medium">{g.name}</span>
                  <span className="shrink-0 text-faint">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <JoinByCodeForm />

      <CreateGroupForm />

      {import.meta.env.DEV && <ConnectionStatus />}
    </main>
  )
}

function JoinByCodeForm() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = normalizeJoinCode(code)
    const problem = checkJoinCode(normalized)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    // Tritt bei oder bleibt Mitglied, wenn man es schon ist (siehe 004_join_code.sql).
    const { data, error } = await getSupabase().rpc('join_group_by_code', { p_code: normalized })
    if (error) {
      // Sperre nach zu vielen Fehlversuchen: Meldung ist schon fertig formuliert.
      setError(
        error.code === JOIN_CODE_RATE_LIMITED ? error.message : `Beitreten hat nicht geklappt: ${error.message}`,
      )
      setBusy(false)
      return
    }
    if (!data) {
      setError('Zu diesem Code gibt es keine Gruppe. Frag nochmal nach.')
      setBusy(false)
      return
    }
    navigate(`/g/${data as string}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-label">Mit Code beitreten</span>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError(null)
          }}
          placeholder="z.B. 7KAX-R3HT"
          maxLength={12}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="field font-mono tracking-widest"
        />
      </label>
      {error && <p className="text-sm text-no">{error}</p>}
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="btn btn-secondary w-full"
      >
        {busy ? 'Trete bei…' : 'Beitreten'}
      </button>
    </form>
  )
}

function CreateGroupForm() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      // Kollision ist bei 12 Zeichen praktisch ausgeschlossen, trotzdem einmal neu würfeln.
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = createSlug()
        const { error } = await getSupabase().from('groups').insert({ slug, name: trimmed })
        if (!error) {
          navigate(`/g/${slug}`)
          return
        }
        if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
      }
      throw new Error('Konnte keinen freien Link erzeugen.')
    } catch (err) {
      setError(`Gruppe anlegen hat nicht geklappt: ${(err as Error).message}`)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-label">Name der neuen Gruppe</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Skiurlaub-Crew"
          maxLength={60}
          required
          className="field"
        />
      </label>
      {error && <p className="text-sm text-no">{error}</p>}
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="btn btn-primary w-full"
      >
        {busy ? 'Lege an…' : 'Neue Gruppe anlegen'}
      </button>
    </form>
  )
}

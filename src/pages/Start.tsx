import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import ConnectionStatus from '../components/ConnectionStatus'
import { createSlug } from '../lib/slug'
import { getSupabase, UNIQUE_VIOLATION } from '../lib/supabase'

export default function Start() {
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
    <main className="mx-auto max-w-md space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Gruppenkalender</h1>
        <p className="text-gray-600">
          Termin mit Freunden finden. Kein Login, die Gruppe ist einfach ein Link.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name der Gruppe</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Skiurlaub-Crew"
            maxLength={60}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-[#5b6cff] focus:ring-2 focus:ring-[#5b6cff]/30"
          />
        </label>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full rounded-lg bg-[#5b6cff] px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Lege an…' : 'Neue Gruppe anlegen'}
        </button>
      </form>

      {import.meta.env.DEV && <ConnectionStatus />}
    </main>
  )
}

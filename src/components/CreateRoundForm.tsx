import { useState, type FormEvent } from 'react'
import { dayCount, isInRange, MAX_WINDOW_DAYS, todayISO } from '../lib/dates'
import { getSupabase } from '../lib/supabase'
import RoundCalendar from './RoundCalendar'

interface Props {
  groupSlug: string
  userId: string
  onCreated: (roundId: string) => void
  onCancel: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-base outline-none focus:border-[#5b6cff] focus:ring-2 focus:ring-[#5b6cff]/30'

export default function CreateRoundForm({ groupSlug, userId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [excluded, setExcluded] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rangeError =
    start && end && end < start
      ? 'Das Ende liegt vor dem Anfang.'
      : start && end && dayCount(start, end) > MAX_WINDOW_DAYS
        ? `Das Zeitfenster darf höchstens ${MAX_WINDOW_DAYS} Tage lang sein.`
        : null
  const rangeValid = Boolean(start && end && !rangeError)

  const headcountNumber = headcount.trim() === '' ? null : Number(headcount)
  const headcountError =
    headcountNumber !== null && (!Number.isInteger(headcountNumber) || headcountNumber < 1 || headcountNumber > 200)
      ? 'Gruppengröße bitte als ganze Zahl zwischen 1 und 200.'
      : null

  // Nur gesperrte Tage im aktuellen Fenster zählen (Fenster kann sich nachträglich ändern)
  const excludedInRange = rangeValid ? excluded.filter((d) => isInRange(d, start, end)).sort() : []

  function handleStartChange(value: string) {
    setStart(value)
    // Ende mitziehen, damit man nicht zweimal durch den Kalender blättern muss
    if (value && (!end || end < value)) setEnd(value)
  }

  function toggleExcluded(iso: string) {
    setExcluded((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !rangeValid || headcountError) return
    setBusy(true)
    setError(null)
    const { data, error } = await getSupabase()
      .from('rounds')
      .insert({
        group_slug: groupSlug,
        title: title.trim(),
        start_date: start,
        end_date: end,
        excluded_dates: excludedInRange,
        headcount: headcountNumber,
        created_by: userId,
      })
      .select('id')
      .single()
    setBusy(false)
    if (error) {
      setError(`Runde anlegen hat nicht geklappt: ${error.message}`)
      return
    }
    onCreated((data as { id: string }).id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Neue Runde</h2>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Titel</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Silvester-Hütte"
          maxLength={60}
          required
          autoFocus
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Von</span>
          <input
            type="date"
            value={start}
            min={todayISO()}
            onChange={(e) => handleStartChange(e.target.value)}
            required
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Bis</span>
          <input
            type="date"
            value={end}
            min={start || todayISO()}
            onChange={(e) => setEnd(e.target.value)}
            required
            className={inputClass}
          />
        </label>
      </div>
      {rangeError && <p className="text-sm text-rose-700">{rangeError}</p>}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Gruppengröße (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
          placeholder="Wie viele sollen mit?"
          className={inputClass}
        />
      </label>
      {headcountError && <p className="text-sm text-rose-700">{headcountError}</p>}

      {rangeValid && (
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">Gesperrte Tage (optional)</p>
            <p className="text-sm text-gray-600">
              Tipp Tage an, die nicht in Frage kommen. Nochmal tippen hebt die Sperre auf.
              {excludedInRange.length > 0 && ` ${excludedInRange.length} gesperrt.`}
            </p>
          </div>
          <RoundCalendar start={start} end={end} excluded={excludedInRange} onToggle={toggleExcluded} />
        </div>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim() || !rangeValid || Boolean(headcountError)}
          className="flex-1 rounded-lg bg-[#5b6cff] px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Lege an…' : 'Runde anlegen'}
        </button>
      </div>
    </form>
  )
}

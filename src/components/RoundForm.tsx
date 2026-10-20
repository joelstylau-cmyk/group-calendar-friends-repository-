import { useState, type FormEvent } from 'react'
import { dayCount, isInRange, MAX_WINDOW_DAYS, todayISO } from '../lib/dates'
import { getSupabase } from '../lib/supabase'
import type { DayMap, Round } from '../lib/types'
import RoundDatePicker from './RoundDatePicker'

type Props =
  | {
      mode: 'create'
      groupSlug: string
      userId: string
      onDone: (roundId: string) => void
      onCancel: () => void
    }
  | {
      mode: 'edit'
      round: Round
      // Einträge aller Personen (user_id -> Tage), für den Hinweis auf rausfallende Tage
      entries: Map<string, DayMap>
      onDone: (roundId: string) => void
      onCancel: () => void
    }

const inputClass = 'field'

// Runde anlegen oder bearbeiten (bearbeiten dürfen Ersteller und Admins, siehe rounds_update).
export default function RoundForm(props: Props) {
  const initial = props.mode === 'edit' ? props.round : null
  const [title, setTitle] = useState(initial?.title ?? '')
  const [start, setStart] = useState(initial?.start_date ?? '')
  const [end, setEnd] = useState(initial?.end_date ?? '')
  const [headcount, setHeadcount] = useState(initial?.headcount != null ? String(initial.headcount) : '')
  const [excluded, setExcluded] = useState<string[]>(initial?.excluded_dates ?? [])
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

  const hidden =
    props.mode === 'edit' && rangeValid ? newlyHiddenEntries(props.round, props.entries, start, end, excludedInRange) : null

  // Beim Anlegen nur ab heute; beim Bearbeiten darf ein schon begonnenes Fenster bleiben
  const minDate = props.mode === 'create' ? todayISO() : undefined

  function handleRangeChange(nextStart: string, nextEnd: string) {
    setStart(nextStart)
    setEnd(nextEnd)
  }

  function toggleExcluded(iso: string) {
    setExcluded((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !rangeValid || headcountError) return
    setBusy(true)
    setError(null)
    const fields = {
      title: title.trim(),
      start_date: start,
      end_date: end,
      excluded_dates: excludedInRange,
      headcount: headcountNumber,
    }
    const supabase = getSupabase()
    const { data, error } =
      props.mode === 'create'
        ? await supabase
            .from('rounds')
            .insert({ ...fields, group_slug: props.groupSlug, created_by: props.userId })
            .select('id')
            .maybeSingle()
        : // Ohne Recht (weder Ersteller noch Admin) ändert RLS still keine Zeile; select macht das sichtbar.
          await supabase.from('rounds').update(fields).eq('id', props.round.id).select('id').maybeSingle()
    setBusy(false)
    const verb = props.mode === 'create' ? 'Runde anlegen' : 'Speichern'
    if (error) {
      setError(`${verb} hat nicht geklappt: ${error.message}`)
      return
    }
    if (!data) {
      setError(`${verb} hat nicht geklappt: Nur wer die Runde angelegt hat und Admins dürfen sie ändern.`)
      return
    }
    props.onDone((data as { id: string }).id)
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-4 sm:p-5">
      <h2 className="text-h2">{props.mode === 'create' ? 'Neue Runde' : 'Runde bearbeiten'}</h2>

      <label className="block space-y-1">
        <span className="text-label">Titel</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Silvester-Hütte"
          maxLength={60}
          required
          autoFocus={props.mode === 'create'}
          className={inputClass}
        />
      </label>

      <RoundDatePicker
        start={start}
        end={end}
        excluded={excludedInRange}
        minDate={minDate}
        onRangeChange={handleRangeChange}
        onToggleExcluded={toggleExcluded}
      />
      {rangeError && <p className="text-sm text-no-ink">{rangeError}</p>}

      <label className="block space-y-1">
        <span className="text-label">Gruppengröße (optional)</span>
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
      {headcountError && <p className="text-sm text-no-ink">{headcountError}</p>}

      {hidden && hidden.people > 0 && (
        <div role="status" className="rounded-[var(--r-md)] bg-maybe-soft p-4 text-sm text-ink">
          <p className="font-semibold text-maybe-ink">⚠ Eingetragene Tage fallen raus</p>
          <p className="mt-1">
            {hidden.people === 1 ? '1 Person hat' : `${hidden.people} Personen haben`} an{' '}
            {hidden.days === 1
              ? '1 Tag, der jetzt außerhalb des Fensters liegt oder gesperrt ist,'
              : `${hidden.days} Tagen, die jetzt außerhalb des Fensters liegen oder gesperrt sind,`}{' '}
            schon etwas eingetragen. Die Einträge bleiben gespeichert, werden aber ausgeblendet und
            zählen nicht mehr. Kommen die Tage später wieder ins Fenster, sind sie wieder da.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-no-ink">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={props.onCancel}
          className="btn btn-secondary flex-1"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={busy || !title.trim() || !rangeValid || Boolean(headcountError)}
          className="btn btn-primary flex-1"
        >
          {props.mode === 'create' ? (busy ? 'Lege an…' : 'Runde anlegen') : busy ? 'Speichere…' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}

// Wie viele Personen an wie vielen Tagen Einträge haben, die bisher sichtbar
// waren und mit dem neuen Fenster bzw. den neuen Sperren ausgeblendet würden.
// Gelöscht wird nichts: Einträge außerhalb des Fensters bleiben in availability.days.
function newlyHiddenEntries(
  round: Round,
  entries: Map<string, DayMap>,
  start: string,
  end: string,
  excluded: string[],
): { people: number; days: number } {
  const oldExcluded = new Set(round.excluded_dates)
  const newExcluded = new Set(excluded)
  const people = new Set<string>()
  const days = new Set<string>()
  for (const [person, map] of entries) {
    for (const day of Object.keys(map)) {
      const wasVisible = isInRange(day, round.start_date, round.end_date) && !oldExcluded.has(day)
      const staysVisible = isInRange(day, start, end) && !newExcluded.has(day)
      if (wasVisible && !staysVisible) {
        people.add(person)
        days.add(day)
      }
    }
  }
  return { people: people.size, days: days.size }
}

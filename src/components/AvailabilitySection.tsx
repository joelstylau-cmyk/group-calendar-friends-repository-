import { useState } from 'react'
import { useAvailabilityDraft, type SaveStatus } from '../hooks/useAvailabilityDraft'
import { useLiveRows } from '../hooks/useLiveRows'
import { dayCount, isInRange } from '../lib/dates'
import { DAY_STATUSES, HATCH, STATUS_META } from '../lib/status'
import type { Availability, Round } from '../lib/types'
import AvailabilityCalendar, { type Brush } from './AvailabilityCalendar'

interface Props {
  round: Round
  clientId: string
}

export default function AvailabilitySection({ round, clientId }: Props) {
  const { rows, loaded, error } = useLiveRows<Availability>('availability', 'round_id', round.id, 'updated_at')
  const myRow = rows.find((r) => r.client_id === clientId)
  const draft = useAvailabilityDraft(round.id, clientId, loaded ? (myRow?.days ?? {}) : null)
  const [editing, setEditing] = useState(false)
  const [brush, setBrush] = useState<Brush>('yes')

  const excludedSet = new Set(round.excluded_dates)
  const isOpenDay = (iso: string) => isInRange(iso, round.start_date, round.end_date) && !excludedSet.has(iso)

  // "Kann"-Zähler pro Tag; mein Eintrag kommt aus dem lokalen Entwurf, damit er sofort stimmt.
  const yesCounts: Record<string, number> = {}
  const allDays = [...rows.filter((r) => r.client_id !== clientId).map((r) => r.days), draft.days]
  for (const days of allDays) {
    for (const [iso, value] of Object.entries(days)) {
      if (value === 'yes' && isOpenDay(iso)) yesCounts[iso] = (yesCounts[iso] ?? 0) + 1
    }
  }

  const openDays = dayCount(round.start_date, round.end_date) - round.excluded_dates.length
  const myCounts = { yes: 0, maybe: 0, no: 0 }
  for (const [iso, value] of Object.entries(draft.days)) {
    if (isOpenDay(iso)) myCounts[value]++
  }
  const answered = myCounts.yes + myCounts.maybe + myCounts.no
  const respondents = new Set([
    ...rows.filter((r) => Object.keys(r.days).some(isOpenDay)).map((r) => r.client_id),
    ...(answered > 0 ? [clientId] : []),
  ]).size

  if (!loaded || !draft.ready) {
    return <p className="text-gray-500">Lade Verfügbarkeiten…</p>
  }

  return (
    <section className={`space-y-4 ${editing ? 'pb-44' : ''}`} aria-label="Verfügbarkeit">
      {error && <p className="text-sm text-rose-700">Verfügbarkeiten laden fehlgeschlagen: {error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p>
            Du: {answered} von {openDays} Tagen eingetragen
            {answered > 0 && (
              <span className="text-gray-500">
                {' '}
                ({DAY_STATUSES.filter((s) => myCounts[s] > 0)
                  .map((s) => `${myCounts[s]} ${STATUS_META[s].glyph}`)
                  .join(' · ')}
                )
              </span>
            )}
          </p>
          <p className="text-gray-500">
            {respondents} {respondents === 1 ? 'Person hat' : 'Personen haben'} eingetragen
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg bg-[#5b6cff] px-4 py-2 text-sm font-medium text-white"
          >
            {answered > 0 ? 'Meine Tage bearbeiten' : 'Meine Tage eintragen'}
          </button>
        )}
        <SaveIndicator status={draft.status} onRetry={draft.retry} />
      </div>

      {editing && (
        <p className="text-sm text-gray-600">
          Pinsel wählen, dann Tage antippen oder mit dem Finger drüberziehen. Ein Tag mit demselben Wert wird beim
          Antippen wieder geleert.
        </p>
      )}

      <AvailabilityCalendar
        start={round.start_date}
        end={round.end_date}
        excluded={round.excluded_dates}
        myDays={draft.days}
        yesCounts={yesCounts}
        editing={editing}
        brush={brush}
        onPaint={draft.update}
      />

      <Legend />

      {editing && (
        <BrushBar
          brush={brush}
          onBrush={setBrush}
          status={draft.status}
          onRetry={draft.retry}
          onDone={() => setEditing(false)}
        />
      )}
    </section>
  )
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'error') {
    return (
      <button type="button" onClick={onRetry} className="text-sm text-rose-700 underline">
        Speichern fehlgeschlagen, nochmal versuchen
      </button>
    )
  }
  return (
    <span className="text-sm text-gray-500" aria-live="polite">
      {status === 'saved' ? '✓ gespeichert' : 'speichert…'}
    </span>
  )
}

const BRUSHES: { value: Brush; glyph: string; label: string; active: string }[] = [
  ...DAY_STATUSES.map((s) => ({
    value: s,
    glyph: STATUS_META[s].glyph,
    label: STATUS_META[s].label,
    active: `${STATUS_META[s].cell} ring-2 ring-offset-1 ring-current`,
  })),
  { value: 'clear', glyph: '⌫', label: 'leeren', active: 'border-gray-400 bg-gray-100 ring-2 ring-offset-1 ring-gray-500' },
]

interface BrushBarProps {
  brush: Brush
  onBrush: (b: Brush) => void
  status: SaveStatus
  onRetry: () => void
  onDone: () => void
}

function BrushBar({ brush, onBrush, status, onRetry, onDone }: BrushBarProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/95 px-4 pt-3 shadow-[0_-4px_16px_rgb(0_0_0/0.06)] backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="mx-auto max-w-md space-y-2">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Pinsel">
          {BRUSHES.map((b) => (
            <button
              key={b.value}
              type="button"
              role="radio"
              aria-checked={brush === b.value}
              onClick={() => onBrush(b.value)}
              className={`flex flex-col items-center rounded-xl border px-1 py-2 text-xs font-medium ${
                brush === b.value ? b.active : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <span className="text-lg leading-none font-bold">{b.glyph}</span>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <SaveIndicator status={status} onRetry={onRetry} />
          <button
            type="button"
            onClick={onDone}
            className="ml-auto rounded-lg bg-[#5b6cff] px-5 py-2 text-sm font-medium text-white"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      {DAY_STATUSES.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${STATUS_META[s].cell}`}>
            {STATUS_META[s].glyph}
          </span>
          du: {STATUS_META[s].label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-emerald-700">3</span> so viele können
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-4 w-4 rounded bg-gray-100" style={{ backgroundImage: HATCH }} /> gesperrt
      </li>
    </ul>
  )
}

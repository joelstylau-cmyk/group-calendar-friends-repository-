import { useState } from 'react'
import type { SaveStatus } from '../hooks/useAvailabilityDraft'
import type { BlockResult } from '../lib/ranking'
import { DAY_STATUSES, HATCH, STATUS_META } from '../lib/status'
import type { DayMap, DayStatus, Round } from '../lib/types'
import AvailabilityCalendar, { type Brush } from './AvailabilityCalendar'

interface Props {
  round: Round
  openDays: string[]
  myDays: DayMap
  saveStatus: SaveStatus
  onPaint: (changes: Record<string, DayStatus | null>) => void
  onRetry: () => void
  dayStats: Record<string, BlockResult>
  total: number
  highlight: Set<string>
  onDayTap: (iso: string) => void
}

export default function AvailabilitySection({
  round,
  openDays,
  myDays,
  saveStatus,
  onPaint,
  onRetry,
  dayStats,
  total,
  highlight,
  onDayTap,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [brush, setBrush] = useState<Brush>('yes')

  const myCounts = { yes: 0, maybe: 0, no: 0 }
  for (const iso of openDays) {
    const value = myDays[iso]
    if (value) myCounts[value]++
  }
  const answered = myCounts.yes + myCounts.maybe + myCounts.no

  return (
    <section className={`space-y-4 ${editing ? 'pb-44' : ''}`} aria-label="Verfügbarkeit">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          Du: {answered} von {openDays.length} Tagen eingetragen
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
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg bg-[#5b6cff] px-4 py-2 text-sm font-medium text-white"
          >
            {answered > 0 ? 'Meine Tage bearbeiten' : 'Meine Tage eintragen'}
          </button>
        )}
        <SaveIndicator status={saveStatus} onRetry={onRetry} />
      </div>

      <p className="text-sm text-gray-600">
        {editing
          ? 'Pinsel wählen, dann Tage antippen oder mit dem Finger drüberziehen. Ein Tag mit demselben Wert wird beim Antippen wieder geleert.'
          : 'Tipp einen Tag an, um zu sehen, wer kann.'}
      </p>

      <AvailabilityCalendar
        start={round.start_date}
        end={round.end_date}
        excluded={round.excluded_dates}
        myDays={myDays}
        dayStats={dayStats}
        total={total}
        highlight={highlight}
        editing={editing}
        brush={brush}
        onPaint={onPaint}
        onDayTap={onDayTap}
      />

      <Legend editing={editing} />

      {editing && (
        <BrushBar
          brush={brush}
          onBrush={setBrush}
          status={saveStatus}
          onRetry={onRetry}
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

function Legend({ editing }: { editing: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      <li className="flex items-center gap-1.5">
        <span className="flex h-1.5 w-8 overflow-hidden rounded-full bg-gray-200">
          <span className={`w-1/2 ${STATUS_META.yes.swatch}`} />
          <span className={`w-1/4 ${STATUS_META.maybe.swatch}`} />
          <span className={`w-1/8 ${STATUS_META.no.swatch}`} />
        </span>
        Balken: kann / vielleicht / keine Zeit / grau = offen
      </li>
      <li className="flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-emerald-700">3</span> so viele können
      </li>
      <li className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold">
          <span className={STATUS_META.yes.text}>✓</span> <span className={STATUS_META.maybe.text}>~</span>{' '}
          <span className={STATUS_META.no.text}>✗</span>
        </span>
        dein Eintrag
      </li>
      {!editing && (
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded ring-2 ring-[#5b6cff]" /> bester Termin
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-4 w-4 rounded bg-gray-100" style={{ backgroundImage: HATCH }} /> gesperrt
      </li>
    </ul>
  )
}

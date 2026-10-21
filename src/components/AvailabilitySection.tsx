import { useState } from 'react'
import type { SaveStatus } from '../hooks/useAvailabilityDraft'
import type { BlockResult } from '../lib/ranking'
import { DAY_STATUSES, HATCH, STATUS_META } from '../lib/status'
import type { DayMap, DayStatus, Round } from '../lib/types'
import AvailabilityCalendar, { type Brush } from './AvailabilityCalendar'
import BottomBar from './BottomBar'

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
  editing: boolean
  onEditingChange: (editing: boolean) => void
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
  editing,
  onEditingChange: setEditing,
}: Props) {
  const [brush, setBrush] = useState<Brush>('yes')

  const myCounts = { yes: 0, maybe: 0, no: 0 }
  for (const iso of openDays) {
    const value = myDays[iso]
    if (value) myCounts[value]++
  }
  const answered = myCounts.yes + myCounts.maybe + myCounts.no

  const actionLabel = answered > 0 ? 'Meine Tage bearbeiten' : 'Meine Tage eintragen'

  return (
    <section className="card space-y-4 p-4" aria-label="Verfügbarkeit">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-headline">Kalender</h2>
          <p className="text-small text-muted">
            Du: {answered} von {openDays.length} Tagen eingetragen
          </p>
          {/* Eigene Zeile, beim Malen immer da: so bricht nichts um und der Kalender bleibt stehen */}
          {(editing || answered > 0) && (
            <p className="text-small whitespace-nowrap text-muted">
              {DAY_STATUSES.map((s) => `${myCounts[s]} ${STATUS_META[s].glyph}`).join(' · ')}
            </p>
          )}
        </div>
        {/* Desktop: Aktion direkt am Kalender; mobil sitzt sie in der festen Leiste unten */}
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-primary hidden md:inline-flex">
            {actionLabel}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-small text-muted">
          {editing
            ? 'Pinsel wählen, dann Tage antippen oder mit dem Finger drüberziehen. Ein Tag mit demselben Wert wird beim Antippen wieder geleert.'
            : 'Tipp einen Tag an, um zu sehen, wer kann.'}
        </p>
        {!editing && <SaveIndicator status={saveStatus} onRetry={onRetry} />}
      </div>

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

      {editing ? (
        <BrushBar
          brush={brush}
          onBrush={setBrush}
          status={saveStatus}
          onRetry={onRetry}
          onDone={() => setEditing(false)}
        />
      ) : (
        <BottomBar mobileOnly>
          <button type="button" onClick={() => setEditing(true)} className="btn btn-primary w-full">
            {actionLabel}
          </button>
        </BottomBar>
      )}
    </section>
  )
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null
  if (status === 'error') {
    return (
      <button type="button" onClick={onRetry} className="text-sm text-no-ink underline">
        Speichern fehlgeschlagen, nochmal versuchen
      </button>
    )
  }
  return (
    <span className="text-sm text-muted" aria-live="polite">
      {status === 'saved' ? '✓ gespeichert' : 'speichert…'}
    </span>
  )
}

// Aktiver Pinsel: gleiche kräftige Farbe wie die gemalten Zellen
const BRUSHES: { value: Brush; glyph: string; label: string; active: string }[] = [
  ...DAY_STATUSES.map((s) => ({
    value: s,
    glyph: STATUS_META[s].glyph,
    label: STATUS_META[s].label,
    active: `${STATUS_META[s].strong} shadow-[var(--shadow-card)]`,
  })),
  { value: 'clear', glyph: '⌫', label: 'leeren', active: 'bg-ink text-surface shadow-[var(--shadow-card)]' },
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
    <BottomBar>
      <div className="space-y-2">
        <div className="segmented grid grid-cols-4" role="radiogroup" aria-label="Pinsel">
          {BRUSHES.map((b) => (
            <button
              key={b.value}
              type="button"
              role="radio"
              aria-checked={brush === b.value}
              onClick={() => onBrush(b.value)}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[10px] text-xs font-semibold transition-colors ${
                brush === b.value ? b.active : 'text-muted'
              }`}
            >
              <span className="text-lg leading-none font-bold">{b.glyph}</span>
              {b.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <SaveIndicator status={status} onRetry={onRetry} />
          <button type="button" onClick={onDone} className="btn btn-primary ml-auto px-6">
            Fertig
          </button>
        </div>
      </div>
    </BottomBar>
  )
}

// Kompakt und immer sichtbar: Die Farben tragen Bedeutung, neue Mitglieder sollen sie sofort verstehen.
function Legend({ editing }: { editing: boolean }) {
  const item = 'flex min-w-0 items-center gap-2'
  const swatch = 'flex w-7 shrink-0 justify-center'
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line pt-3 text-xs text-muted">
      <li className={`${item} col-span-2`}>
        <span className={swatch}>
          <span className="flex h-1.5 w-7 overflow-hidden rounded-full bg-faint/30">
            <span className={`w-1/2 ${STATUS_META.yes.swatch}`} />
            <span className={`w-1/4 ${STATUS_META.maybe.swatch}`} />
            <span className={`w-1/8 ${STATUS_META.no.swatch}`} />
          </span>
        </span>
        <span>
          Balken: <span className={STATUS_META.yes.text}>kann</span> /{' '}
          <span className={STATUS_META.maybe.text}>vielleicht</span> /{' '}
          <span className={STATUS_META.no.text}>keine Zeit</span> / grau offen
        </span>
      </li>
      <li className={item}>
        <span className={`${swatch} text-[11px] font-bold text-yes-ink`}>3</span>
        so viele können
      </li>
      <li className={item}>
        <span className={`${swatch} gap-0.5 text-[11px] font-bold`}>
          <span className={STATUS_META.yes.text}>✓</span>
          <span className={STATUS_META.maybe.text}>~</span>
          <span className={STATUS_META.no.text}>✗</span>
        </span>
        dein Eintrag
      </li>
      <li className={item}>
        <span className={swatch}>
          <span className="h-4 w-4 rounded-[5px] bg-surface-2" style={{ backgroundImage: HATCH }} />
        </span>
        gesperrt
      </li>
      {!editing && (
        <li className={item}>
          <span className={swatch}>
            <span className="h-4 w-4 rounded-[5px] ring-2 ring-accent" />
          </span>
          bester Termin
        </li>
      )}
    </ul>
  )
}

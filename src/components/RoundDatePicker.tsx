import { useState } from 'react'
import {
  addDays,
  dayCount,
  dayOfMonth,
  formatDays,
  formatMonth,
  formatRange,
  isInRange,
  MAX_WINDOW_DAYS,
  monthCells,
  parseISODate,
  todayISO,
  WEEKDAYS,
} from '../lib/dates'
import { HATCH } from '../lib/status'

interface Props {
  start: string
  end: string
  // Nur die gesperrten Tage im aktuellen Fenster
  excluded: string[]
  // Frühester wählbarer Tag (beim Anlegen heute), beim Bearbeiten keiner
  minDate?: string
  onRangeChange: (start: string, end: string) => void
  onToggleExcluded: (iso: string) => void
}

type Mode = 'range' | 'exclude'

// So weit lässt sich nach vorne blättern
const MONTHS_AHEAD = 24

const monthIndex = (iso: string) => {
  const d = parseISODate(iso)
  return d.getFullYear() * 12 + d.getMonth()
}

const longDay = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

// Zeitfenster einer Runde direkt im Monatskalender wählen: erster Tipp Start, zweiter Tipp Ende,
// der Bereich dazwischen färbt sich. Danach im selben Kalender einzelne Tage sperren.
export default function RoundDatePicker({ start, end, excluded, minDate, onRangeChange, onToggleExcluded }: Props) {
  const rangeComplete = Boolean(start && end && end >= start && dayCount(start, end) <= MAX_WINDOW_DAYS)
  const pickingEnd = Boolean(start && !end)
  const [mode, setMode] = useState<Mode>('range')
  const activeMode: Mode = rangeComplete ? mode : 'range'
  const [view, setView] = useState(() => monthIndex(start || minDate || todayISO()))

  // Blätter-Grenzen: im Sperr-Modus nur die Monate des Fensters
  const today = todayISO()
  const lowest = monthIndex(minDate ?? (start && start < today ? start : today))
  const [lo, hi] =
    activeMode === 'exclude' ? [monthIndex(start), monthIndex(end)] : [lowest, lowest + MONTHS_AHEAD]
  const shown = Math.min(Math.max(view, lo), hi)
  const year = Math.floor(shown / 12)
  const month = shown % 12

  const latestEnd = start ? addDays(start, MAX_WINDOW_DAYS - 1) : null
  const excludedSet = new Set(excluded)

  function handleRangeTap(iso: string) {
    if (pickingEnd && iso >= start) {
      onRangeChange(start, iso)
      // Zeitraum steht: weiter mit Tage sperren
      setMode('exclude')
    } else {
      // Erster Tipp, Tipp vor den Start oder neuer Anlauf nach fertigem Zeitraum
      onRangeChange(iso, '')
    }
  }

  function handleTypedStart(value: string) {
    // Ende mitziehen, damit man nicht zweimal durch den Kalender blättern muss
    onRangeChange(value, value && (!end || end < value) ? value : end)
    if (value) setView(monthIndex(value))
  }

  function handleTypedEnd(value: string) {
    onRangeChange(start, value)
  }

  function switchMode(next: Mode) {
    setMode(next)
    if (next === 'exclude') setView(monthIndex(start))
  }

  const hint =
    activeMode === 'exclude'
      ? 'Tipp Tage an, die nicht in Frage kommen. Nochmal tippen hebt die Sperre auf.'
      : pickingEnd
        ? `Jetzt den letzten Tag antippen (höchstens ${MAX_WINDOW_DAYS} Tage).`
        : start
          ? 'Für einen neuen Zeitraum tippst du einfach einen neuen ersten Tag an.'
          : 'Tipp den ersten Tag an.'

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-label">Zeitraum</p>
        <p className="font-display text-[17px] font-bold">
          {rangeComplete
            ? `${formatRange(start, end)} · ${dayCount(start, end)} ${dayCount(start, end) === 1 ? 'Tag' : 'Tage'}`
            : start
              ? `Ab ${formatDays([start])} …`
              : 'Noch kein Zeitraum gewählt'}
        </p>
      </div>

      <div className="segmented" role="group" aria-label="Was tippst du an?">
        <button type="button" aria-pressed={activeMode === 'range'} onClick={() => switchMode('range')}>
          Zeitraum wählen
        </button>
        <button
          type="button"
          aria-pressed={activeMode === 'exclude'}
          onClick={() => switchMode('exclude')}
          disabled={!rangeComplete}
          className="disabled:opacity-40"
        >
          Tage sperren{excluded.length > 0 && ` (${excluded.length})`}
        </button>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {hint}
      </p>

      <section aria-label={formatMonth(year, month)}>
        <div className="mb-2 flex items-center justify-between">
          <MonthButton dir="prev" disabled={shown <= lo} onClick={() => setView(shown - 1)} />
          <h3 className="font-display text-[15px] font-bold">{formatMonth(year, month)}</h3>
          <MonthButton dir="next" disabled={shown >= hi} onClick={() => setView(shown + 1)} />
        </div>

        {/* Zellen 44px hoch und so breit wie möglich (-mx-1), damit sie sich auf dem Handy gut treffen lassen */}
        <div className="-mx-1 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-1 text-[11px] font-semibold text-muted">
              {w}
            </div>
          ))}
          {monthCells(year, month).map((iso, i) => {
            if (!iso) return <div key={`empty-${i}`} />
            const label = longDay.format(parseISODate(iso))
            const base = 'flex h-11 w-full items-center justify-center rounded-[10px] text-[15px] transition active:scale-95'

            if (activeMode === 'exclude') {
              const inWindow = isInRange(iso, start, end)
              if (!inWindow) {
                return (
                  <span key={iso} className={`${base} text-faint/50`}>
                    {dayOfMonth(iso)}
                  </span>
                )
              }
              const isExcluded = excludedSet.has(iso)
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onToggleExcluded(iso)}
                  aria-pressed={isExcluded}
                  aria-label={`${label}${isExcluded ? ', gesperrt' : ''}`}
                  className={
                    isExcluded
                      ? `${base} bg-surface-2/60 text-faint line-through`
                      : `${base} bg-surface-2 font-semibold`
                  }
                  style={isExcluded ? { backgroundImage: HATCH } : undefined}
                >
                  {dayOfMonth(iso)}
                </button>
              )
            }

            const disabled =
              Boolean(minDate && iso < minDate) || Boolean(pickingEnd && latestEnd && iso > latestEnd)
            const isEdge = iso === start || (rangeComplete && iso === end)
            const inside = rangeComplete && isInRange(iso, start, end) && !isEdge
            const className = isEdge
              ? `${base} bg-accent font-bold text-on-accent`
              : inside
                ? `${base} bg-accent-soft font-semibold text-ink`
                : disabled
                  ? `${base} text-faint/50`
                  : `${base} text-ink hover:bg-surface-2 ${iso === today ? 'font-bold ring-1 ring-line ring-inset' : ''}`
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => handleRangeTap(iso)}
                aria-pressed={isEdge || inside}
                aria-label={`${label}${iso === start ? ', Start' : iso === end && rangeComplete ? ', Ende' : ''}`}
                className={`${className} disabled:active:scale-100`}
              >
                {dayOfMonth(iso)}
              </button>
            )
          })}
        </div>
      </section>

      {activeMode === 'exclude' && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded bg-surface-2" /> im Zeitfenster
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded bg-surface-2" style={{ backgroundImage: HATCH }} />{' '}
            gesperrt
          </li>
          <li className="flex items-center gap-1.5">
            <span className="text-faint/50">12</span> außerhalb
          </li>
        </ul>
      )}

      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted hover:text-ink">
          Datum lieber eintippen
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-label">Von</span>
            <input
              type="date"
              value={start}
              min={minDate}
              onChange={(e) => handleTypedStart(e.target.value)}
              className="field"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-label">Bis</span>
            <input
              type="date"
              value={end}
              min={start || minDate}
              onChange={(e) => handleTypedEnd(e.target.value)}
              className="field"
            />
          </label>
        </div>
      </details>
    </div>
  )
}

function MonthButton({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Vorheriger Monat' : 'Nächster Monat'}
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-ink hover:bg-surface-2 disabled:text-faint/40 disabled:hover:bg-transparent"
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  )
}

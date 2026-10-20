import { useRef, type PointerEvent } from 'react'
import { dayOfMonth } from '../lib/dates'
import type { BlockResult } from '../lib/ranking'
import { DAY_STATUSES, HATCH, STATUS_META } from '../lib/status'
import type { DayMap, DayStatus } from '../lib/types'
import CalendarGrid from './CalendarGrid'

export type Brush = DayStatus | 'clear'

interface Props {
  start: string
  end: string
  excluded: string[]
  myDays: DayMap
  // Verteilung pro offenem Tag (inkl. mir)
  dayStats: Record<string, BlockResult>
  // Anzahl Personen, auf die sich die Balken beziehen
  total: number
  // Hervorgehobene Tage (aktuell bester Termin)
  highlight: Set<string>
  editing: boolean
  brush: Brush
  onPaint: (changes: Record<string, DayStatus | null>) => void
  onDayTap: (iso: string) => void
}

const cellBase = 'relative flex aspect-square w-full items-center justify-center rounded-[10px] text-sm'

export default function AvailabilityCalendar({
  start,
  end,
  excluded,
  myDays,
  dayStats,
  total,
  highlight,
  editing,
  brush,
  onPaint,
  onDayTap,
}: Props) {
  const excludedSet = new Set(excluded)
  // Ein Strich (Tippen oder Ziehen) setzt alle berührten Tage auf denselben Wert.
  // Beginnt er auf einem Tag, der schon den Pinsel-Wert hat, radiert er stattdessen.
  const strokeRef = useRef<{ value: DayStatus | null; visited: Set<string> } | null>(null)

  function dayAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-paint]')
    return el?.dataset.paint ?? null
  }

  function valueFor(iso: string): DayStatus | null {
    const target = brush === 'clear' ? null : brush
    return (myDays[iso] ?? null) === target ? null : target
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!editing) return
    const iso = dayAt(e.clientX, e.clientY)
    if (!iso) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const value = valueFor(iso)
    strokeRef.current = { value, visited: new Set([iso]) }
    onPaint({ [iso]: value })
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const stroke = strokeRef.current
    if (!stroke) return
    const iso = dayAt(e.clientX, e.clientY)
    if (!iso || stroke.visited.has(iso)) return
    stroke.visited.add(iso)
    onPaint({ [iso]: stroke.value })
  }

  function endStroke() {
    strokeRef.current = null
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      // Nur im Edit-Modus Gesten abfangen, sonst soll normal gescrollt werden.
      className={editing ? 'touch-none select-none' : undefined}
    >
      <CalendarGrid
        start={start}
        end={end}
        renderDay={(iso, inWindow) => {
          const day = dayOfMonth(iso)
          if (!inWindow) {
            return <span className={`${cellBase} text-faint/50`}>{day}</span>
          }
          if (excludedSet.has(iso)) {
            return (
              <span
                className={`${cellBase} bg-surface-2/60 text-faint line-through`}
                style={{ backgroundImage: HATCH }}
                aria-label={`${iso}, gesperrt`}
              >
                {day}
              </span>
            )
          }

          const mine = myDays[iso]
          const meta = mine ? STATUS_META[mine] : null
          const stats = dayStats[iso]
          const yes = stats?.yes.length ?? 0
          const label =
            `${iso}: ${yes} ${yes === 1 ? 'kann' : 'können'}, ${stats?.maybe.length ?? 0} vielleicht, ` +
            `${stats?.no.length ?? 0} keine Zeit; du: ${meta ? meta.label : 'keine Angabe'}`
          // Im Edit-Modus zeigt die Zellfarbe kräftig meinen Eintrag, sonst steht die Gruppe im Vordergrund.
          const strong = editing && meta
          const surface = strong ? meta.strong : 'bg-surface-2 text-ink'
          const ring = !editing && highlight.has(iso) ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''
          const className = `${cellBase} font-semibold ${surface} ${ring} cursor-pointer transition-colors`

          const content = (
            <>
              {meta && (
                <span
                  className={`absolute top-1 left-1.5 text-[11px] leading-none font-bold ${strong ? '' : meta.text}`}
                >
                  {meta.glyph}
                </span>
              )}
              {yes > 0 && (
                <span
                  className={`absolute top-1 right-1.5 text-[11px] leading-none font-bold ${strong ? 'opacity-80' : 'text-yes-ink'}`}
                >
                  {yes}
                </span>
              )}
              <span className="-mt-0.5 text-[15px]">{day}</span>
              {stats && total > 0 && <DayBar stats={stats} total={total} onStrong={Boolean(strong)} />}
            </>
          )

          if (!editing) {
            return (
              <button type="button" onClick={() => onDayTap(iso)} aria-label={label} className={className}>
                {content}
              </button>
            )
          }
          return (
            <button
              type="button"
              data-paint={iso}
              aria-label={label}
              className={className}
              // Nur Tastatur-Klicks (detail 0) behandeln, Zeiger laufen über die Pointer-Events.
              onClick={(e) => {
                if (e.detail === 0) onPaint({ [iso]: valueFor(iso) })
              }}
            >
              {content}
            </button>
          )
        }}
      />
    </div>
  )
}

// Gestapelter Mini-Balken: Anteil kann / vielleicht / keine Zeit, Rest grau = keine Antwort
function DayBar({ stats, total, onStrong }: { stats: BlockResult; total: number; onStrong: boolean }) {
  return (
    <span
      className={`absolute inset-x-1.5 bottom-1.5 flex h-1 overflow-hidden rounded-full ${onStrong ? 'bg-surface/50' : 'bg-faint/30'}`}
    >
      {DAY_STATUSES.map((s) => {
        const n = stats[s].length
        return n > 0 ? (
          <span key={s} className={STATUS_META[s].swatch} style={{ width: `${(n / total) * 100}%` }} />
        ) : null
      })}
    </span>
  )
}

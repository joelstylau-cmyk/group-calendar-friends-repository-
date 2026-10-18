import { useRef, type PointerEvent } from 'react'
import { dayOfMonth } from '../lib/dates'
import { HATCH, STATUS_META } from '../lib/status'
import type { DayMap, DayStatus } from '../lib/types'
import CalendarGrid from './CalendarGrid'

export type Brush = DayStatus | 'clear'

interface Props {
  start: string
  end: string
  excluded: string[]
  myDays: DayMap
  // Anzahl Personen pro Tag, die "kann" eingetragen haben (inkl. mir)
  yesCounts: Record<string, number>
  editing: boolean
  brush: Brush
  onPaint: (changes: Record<string, DayStatus | null>) => void
}

const cellBase = 'relative flex aspect-square w-full items-center justify-center rounded-lg border text-sm'

export default function AvailabilityCalendar({
  start,
  end,
  excluded,
  myDays,
  yesCounts,
  editing,
  brush,
  onPaint,
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
            return <span className={`${cellBase} border-transparent text-gray-300`}>{day}</span>
          }
          if (excludedSet.has(iso)) {
            return (
              <span
                className={`${cellBase} border-transparent bg-gray-100 text-gray-400 line-through`}
                style={{ backgroundImage: HATCH }}
                aria-label={`${iso}, gesperrt`}
              >
                {day}
              </span>
            )
          }

          const mine = myDays[iso]
          const meta = mine ? STATUS_META[mine] : null
          const count = yesCounts[iso] ?? 0
          const label = `${iso}: du ${meta ? meta.label : 'keine Angabe'}, ${count} ${count === 1 ? 'kann' : 'können'}`
          const className = `${cellBase} font-medium ${meta ? meta.cell : 'border-gray-200 bg-white'} ${
            editing ? 'cursor-pointer' : ''
          }`
          const content = (
            <>
              {meta && <span className="absolute top-0.5 right-1 text-[10px] leading-none font-bold">{meta.glyph}</span>}
              {day}
              {count > 0 && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] leading-none font-semibold text-emerald-700">
                  {count}
                </span>
              )}
            </>
          )

          if (!editing) {
            return (
              <span className={className} aria-label={label}>
                {content}
              </span>
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

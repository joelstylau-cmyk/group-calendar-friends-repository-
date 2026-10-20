import { dayOfMonth } from '../lib/dates'
import { HATCH } from '../lib/status'
import CalendarGrid from './CalendarGrid'

interface Props {
  start: string
  end: string
  excluded: string[]
  // Wenn gesetzt, lassen sich Tage im Fenster per Tippen sperren/entsperren.
  onToggle?: (iso: string) => void
}

const cellBase = 'flex aspect-square w-full items-center justify-center rounded-lg text-sm'

export default function RoundCalendar({ start, end, excluded, onToggle }: Props) {
  const excludedSet = new Set(excluded)

  return (
    <div className="space-y-4">
      <CalendarGrid
        start={start}
        end={end}
        renderDay={(iso, inWindow) => {
          const day = dayOfMonth(iso)
          if (!inWindow) {
            return <span className={`${cellBase} text-faint/60`}>{day}</span>
          }
          const isExcluded = excludedSet.has(iso)
          const className = isExcluded
            ? `${cellBase} bg-surface-2 text-faint line-through`
            : `${cellBase} border border-line bg-surface font-medium`
          const style = isExcluded ? { backgroundImage: HATCH } : undefined
          const label = `${iso}${isExcluded ? ', gesperrt' : ''}`

          if (!onToggle) {
            return (
              <span className={className} style={style} aria-label={label}>
                {day}
              </span>
            )
          }
          return (
            <button
              type="button"
              onClick={() => onToggle(iso)}
              aria-pressed={isExcluded}
              aria-label={label}
              className={`${className} transition active:scale-95`}
              style={style}
            >
              {day}
            </button>
          )
        }}
      />
      <Legend />
    </div>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-3.5 rounded border border-line bg-surface" /> im Zeitfenster
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="inline-block h-3.5 w-3.5 rounded bg-surface-2"
          style={{ backgroundImage: HATCH }}
        />{' '}
        gesperrt
      </li>
      <li className="flex items-center gap-1.5">
        <span className="text-faint/60">12</span> außerhalb
      </li>
    </ul>
  )
}

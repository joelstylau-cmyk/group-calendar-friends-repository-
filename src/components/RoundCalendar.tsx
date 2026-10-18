import { dayOfMonth } from '../lib/dates'
import CalendarGrid from './CalendarGrid'

interface Props {
  start: string
  end: string
  excluded: string[]
  // Wenn gesetzt, lassen sich Tage im Fenster per Tippen sperren/entsperren.
  onToggle?: (iso: string) => void
}

const HATCH = 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.07) 0 4px, transparent 4px 8px)'

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
            return <span className={`${cellBase} text-gray-300`}>{day}</span>
          }
          const isExcluded = excludedSet.has(iso)
          const className = isExcluded
            ? `${cellBase} bg-gray-100 text-gray-400 line-through`
            : `${cellBase} border border-gray-200 bg-white font-medium`
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
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-3.5 rounded border border-gray-200 bg-white" /> im Zeitfenster
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="inline-block h-3.5 w-3.5 rounded bg-gray-100"
          style={{ backgroundImage: HATCH }}
        />{' '}
        gesperrt
      </li>
      <li className="flex items-center gap-1.5">
        <span className="text-gray-300">12</span> außerhalb
      </li>
    </ul>
  )
}

import type { ReactNode } from 'react'
import { formatMonth, isInRange, monthCells, monthsInRange, WEEKDAYS } from '../lib/dates'

interface Props {
  start: string
  end: string
  renderDay: (iso: string, inWindow: boolean) => ReactNode
}

// Monats-Grids (Montag-Start) für alle Monate des Fensters.
// Wie ein Tag aussieht, entscheidet der Aufrufer über renderDay.
export default function CalendarGrid({ start, end, renderDay }: Props) {
  return (
    <div className="space-y-6">
      {monthsInRange(start, end).map(({ year, month }) => (
        <section key={`${year}-${month}`}>
          <h3 className="mb-2 font-semibold">{formatMonth(year, month)}</h3>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-xs font-medium text-gray-500">
                {w}
              </div>
            ))}
            {monthCells(year, month).map((iso, i) =>
              iso ? (
                <div key={iso}>{renderDay(iso, isInRange(iso, start, end))}</div>
              ) : (
                <div key={`empty-${i}`} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

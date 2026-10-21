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
          <h3 className="mb-3 text-[15px] font-bold">{formatMonth(year, month)}</h3>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="pb-1 text-[11px] font-semibold text-muted">
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

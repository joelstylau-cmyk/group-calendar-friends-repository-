// Datums-Helfer auf Basis von ISO-Tagen ("YYYY-MM-DD").
// Gerechnet wird in lokaler Zeit, damit es keine Zeitzonen-Verschiebungen gibt.
// ISO-Tage lassen sich direkt als Strings vergleichen (<, <=).

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Maximale Länge eines Runden-Fensters in Tagen
export const MAX_WINDOW_DAYS = 184

const pad = (n: number) => String(n).padStart(2, '0')

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function dayCount(start: string, end: string): number {
  const a = parseISODate(start)
  const b = parseISODate(end)
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86_400_000) + 1
}

export function isInRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}

// Alle Monate, die das Fenster berührt (month ist 0-basiert)
export function monthsInRange(start: string, end: string): { year: number; month: number }[] {
  const s = parseISODate(start)
  const e = parseISODate(end)
  const result: { year: number; month: number }[] = []
  let year = s.getFullYear()
  let month = s.getMonth()
  while (year < e.getFullYear() || (year === e.getFullYear() && month <= e.getMonth())) {
    result.push({ year, month })
    month++
    if (month === 12) {
      month = 0
      year++
    }
  }
  return result
}

// Zellen eines Monats-Grids mit Montag-Start; null = Leerzelle vor/nach dem Monat
export function monthCells(year: number, month: number): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(d)}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const monthFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })
const rangeFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatMonth(year: number, month: number): string {
  return monthFormat.format(new Date(year, month, 1))
}

export function formatRange(start: string, end: string): string {
  return rangeFormat.formatRange(parseISODate(start), parseISODate(end))
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10))
}

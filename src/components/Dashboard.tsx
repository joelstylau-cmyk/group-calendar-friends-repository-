import { useEffect, useState } from 'react'
import { formatDays } from '../lib/dates'
import type { RangeRanking } from '../lib/ranking'
import { STATUS_META } from '../lib/status'

export interface LengthRange {
  min: number
  max: number
}

interface Props {
  range: LengthRange
  maxLength: number
  onRange: (range: LengthRange) => void
  ranking: RangeRanking
  total: number
  onOpen: (days: string[]) => void
}

const daysLabel = (n: number) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`

// [3, 4, 6, 7, 8] -> "3–4 und 6–8 Tage"
function formatLengths(lengths: number[]): string {
  const runs: [number, number][] = []
  for (const l of lengths) {
    const last = runs.at(-1)
    if (last && last[1] === l - 1) last[1] = l
    else runs.push([l, l])
  }
  const parts = runs.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`))
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} und ${parts.at(-1)}` : parts[0]
  return `${text} ${lengths.length === 1 && lengths[0] === 1 ? 'Tag' : 'Tage'}`
}

export default function Dashboard({ range, maxLength, onRange, ranking, total, onOpen }: Props) {
  const [best, ...others] = ranking.blocks
  const rangeText = range.min === range.max ? daysLabel(range.min) : `${range.min} bis ${range.max} Tage`

  function setMin(min: number) {
    onRange({ min, max: Math.max(min, range.max) })
  }
  function setMax(max: number) {
    onRange({ min: Math.min(max, range.min), max })
  }

  return (
    <section className="space-y-3" aria-label="Beste Termine">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-h2">Beste Termine</h2>
        <div className="flex items-center gap-1.5 text-small text-muted">
          <Stepper label="Mindestlänge in Tagen" value={range.min} min={1} max={maxLength} onChange={setMin} />
          <span>bis</span>
          <Stepper label="Höchstlänge in Tagen" value={range.max} min={1} max={maxLength} onChange={setMax} />
          <span>Tage</span>
        </div>
      </div>

      {!best ? (
        <div className="card p-5 text-center text-sm text-muted">
          Für {rangeText} am Stück passt kein Block: An keinem Zeitraum dieser Länge kann jemand an allen Tagen.
        </div>
      ) : (
        <>
          {/* Hero: die lauteste Stelle der Rundenansicht */}
          <button
            type="button"
            onClick={() => onOpen(best.days)}
            className="w-full rounded-[var(--r-lg)] bg-accent p-5 text-left text-on-accent shadow-[var(--shadow-raised)] transition active:scale-[0.99]"
          >
            <span className="text-small opacity-85">Aktuell bester Termin · {daysLabel(best.days.length)}</span>
            <span className="text-display mt-1 block">{formatDays(best.days)}</span>
            <span className="mt-3 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-on-accent/15 px-3 py-1 text-sm font-semibold">
                {STATUS_META.yes.glyph} {best.yes.length} von {total} können durchgehend
              </span>
              <span className="text-small opacity-75">Details ›</span>
            </span>
          </button>

          {others.length > 0 && (
            <ol className="card divide-y divide-line overflow-hidden">
              {others.map((b) => (
                <li key={`${b.days[0]}-${b.days.length}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(b.days)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{formatDays(b.days)}</span>
                      <span className="block text-small text-muted">{daysLabel(b.days.length)}</span>
                    </span>
                    {/* Eine klare Zahl pro Vorschlag */}
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-right leading-tight">
                        <span className={`block font-display text-xl font-bold ${STATUS_META.yes.text}`}>
                          {STATUS_META.yes.glyph} {b.yes.length}
                        </span>
                        <span className="block text-[11px] text-muted">
                          {b.yes.length === 1 ? 'kann' : 'können'} durchgehend
                        </span>
                      </span>
                      <span className="text-faint" aria-hidden="true">
                        ›
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {ranking.emptyLengths.length > 0 && (
            <p className="rounded-[var(--r-md)] bg-surface-2 px-4 py-3 text-small text-muted">
              <span className="font-semibold text-ink">{formatLengths(ranking.emptyLengths)} am Stück:</span> kein
              Block, an dem jemand an allen Tagen kann.
            </p>
          )}
        </>
      )}

      <p className="px-1 text-xs text-muted">
        Gezählt wird nur, wer an allen Tagen eines Blocks „kann“ eingetragen hat. Bei Gleichstand steht der längere
        Block oben.
      </p>
    </section>
  )
}

interface StepperProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function Stepper({ label, value, min, max, onChange }: StepperProps) {
  // Eingabe als Text puffern, damit man frei tippen kann (auch kurz leer)
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  function commit(raw: string) {
    const n = Number.parseInt(raw, 10)
    if (Number.isNaN(n)) setText(String(value))
    else onChange(Math.min(max, Math.max(min, n)))
  }

  const button = 'h-9 w-9 rounded-[8px] text-lg font-semibold text-ink hover:bg-surface disabled:opacity-30'
  return (
    <span className="inline-flex items-center rounded-[var(--r-sm)] bg-surface-2 p-0.5">
      <button
        type="button"
        aria-label={`${label} verringern`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={button}
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const n = Number.parseInt(e.target.value, 10)
          if (!Number.isNaN(n) && n >= min && n <= max) onChange(n)
        }}
        onBlur={(e) => commit(e.target.value)}
        className="w-9 bg-transparent py-1.5 text-center text-base font-semibold text-ink outline-none"
      />
      <button
        type="button"
        aria-label={`${label} erhöhen`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={button}
      >
        +
      </button>
    </span>
  )
}

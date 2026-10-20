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
    <section className="space-y-4" aria-label="Beste Termine">
      <div className="space-y-2">
        <h3 className="font-semibold">Beste Termine</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Länge von</span>
          <Stepper label="Mindestlänge in Tagen" value={range.min} min={1} max={maxLength} onChange={setMin} />
          <span>bis</span>
          <Stepper label="Höchstlänge in Tagen" value={range.max} min={1} max={maxLength} onChange={setMax} />
          <span>Tage</span>
        </div>
        <p className="text-xs text-muted">
          Gezählt wird nur, wer an allen Tagen eines Blocks „kann“ eingetragen hat. Bei Gleichstand steht der längere
          Block oben.
        </p>
      </div>

      {!best ? (
        <div className="rounded-2xl border border-dashed border-faint/50 p-5 text-center text-sm text-muted">
          Für {rangeText} am Stück passt kein Block: An keinem Zeitraum dieser Länge kann jemand an allen Tagen.
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onOpen(best.days)}
            className="w-full rounded-2xl bg-accent p-5 text-left text-on-accent shadow-md transition active:scale-[0.99]"
          >
            <span className="text-xs font-medium tracking-wide uppercase opacity-80">
              Aktuell bester Termin · {daysLabel(best.days.length)}
            </span>
            <span className="mt-1 block text-2xl font-bold">{formatDays(best.days)}</span>
            <span className="mt-2 block text-sm font-semibold">
              {STATUS_META.yes.glyph} {best.yes.length} von {total} können durchgehend
            </span>
            <span className="mt-1 block text-xs opacity-75">Antippen für Details</span>
          </button>

          {others.length > 0 && (
            <ol className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {others.map((b) => (
                <li key={`${b.days[0]}-${b.days.length}`}>
                  <button
                    type="button"
                    onClick={() => onOpen(b.days)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{formatDays(b.days)}</span>
                      <span className="block text-xs text-muted">{daysLabel(b.days.length)}</span>
                    </span>
                    <span className={`shrink-0 text-right text-sm ${STATUS_META.yes.text}`}>
                      {STATUS_META.yes.glyph} {b.yes.length} {b.yes.length === 1 ? 'kann' : 'können'} durchgehend
                      <span className="ml-2 text-faint">›</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {ranking.emptyLengths.length > 0 && (
            <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">
              <span className="font-medium text-ink">{formatLengths(ranking.emptyLengths)} am Stück:</span> kein
              Block, an dem jemand an allen Tagen kann.
            </p>
          )}
        </>
      )}
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

  const button = 'h-9 w-9 text-lg font-medium text-ink disabled:opacity-30'
  return (
    <span className="inline-flex items-center rounded-lg border border-faint/50 bg-surface">
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
        className="w-10 border-x border-faint/50 py-1.5 text-center text-base outline-none"
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

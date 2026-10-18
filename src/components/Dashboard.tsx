import { useEffect, useState } from 'react'
import { formatDays } from '../lib/dates'
import type { LengthResult, StrictBlock } from '../lib/ranking'
import { STATUS_META } from '../lib/status'

export interface LengthRange {
  min: number
  max: number
}

interface Props {
  range: LengthRange
  maxLength: number
  onRange: (range: LengthRange) => void
  results: LengthResult[]
  best: StrictBlock | undefined
  total: number
  onOpen: (days: string[]) => void
}

const daysLabel = (n: number) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`

// Aufeinanderfolgende Längen ohne Treffer zu einer Meldung zusammenfassen
type Section = { kind: 'hits'; result: LengthResult } | { kind: 'empty'; from: number; to: number }

function toSections(results: LengthResult[]): Section[] {
  const sections: Section[] = []
  for (const result of results) {
    const last = sections.at(-1)
    if (result.blocks.length > 0) sections.push({ kind: 'hits', result })
    else if (last?.kind === 'empty' && last.to === result.length - 1) last.to = result.length
    else sections.push({ kind: 'empty', from: result.length, to: result.length })
  }
  return sections
}

export default function Dashboard({ range, maxLength, onRange, results, best, total, onOpen }: Props) {
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
        <p className="text-xs text-gray-500">Gezählt wird nur, wer an allen Tagen eines Blocks „kann“ eingetragen hat.</p>
      </div>

      {best ? (
        <button
          type="button"
          onClick={() => onOpen(best.days)}
          className="w-full rounded-2xl bg-[#5b6cff] p-5 text-left text-white shadow-md transition active:scale-[0.99]"
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
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-600">
          Für {range.min === range.max ? daysLabel(range.min) : `${range.min} bis ${range.max} Tage`} am Stück gibt es
          noch keinen Block, an dem jemand an allen Tagen kann.
        </div>
      )}

      <div className="space-y-4">
        {toSections(results).map((s) =>
          s.kind === 'empty' ? (
            <p
              key={`empty-${s.from}`}
              className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600"
            >
              <span className="font-medium text-gray-800">
                {s.from === s.to ? daysLabel(s.from) : `${s.from}–${s.to} Tage`} am Stück:
              </span>{' '}
              kein Block, an dem jemand an allen Tagen kann.
            </p>
          ) : (
            <div key={`hits-${s.result.length}`} className="space-y-1.5">
              <h4 className="text-sm font-medium text-gray-500">{daysLabel(s.result.length)} am Stück</h4>
              <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
                {s.result.blocks.map((b) => (
                  <li key={b.days[0]}>
                    <button
                      type="button"
                      onClick={() => onOpen(b.days)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium">{formatDays(b.days)}</span>
                      <span className={`shrink-0 text-sm ${STATUS_META.yes.text}`}>
                        {STATUS_META.yes.glyph} {b.yes.length} {b.yes.length === 1 ? 'kann' : 'können'} durchgehend
                        <span className="ml-2 text-gray-400">›</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ),
        )}
      </div>
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

  const button = 'h-9 w-9 text-lg font-medium text-gray-700 disabled:opacity-30'
  return (
    <span className="inline-flex items-center rounded-lg border border-gray-300">
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
        className="w-10 border-x border-gray-300 py-1.5 text-center text-base outline-none"
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

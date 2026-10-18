import type { DayStatus } from './types'

// Zustandsfarben immer mit Glyph, nie nur über Farbe (SPEC: Design-Richtung).
export const STATUS_META: Record<
  DayStatus,
  { glyph: string; label: string; cell: string; swatch: string; text: string }
> = {
  yes: {
    glyph: '✓',
    label: 'kann',
    cell: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    swatch: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  maybe: {
    glyph: '~',
    label: 'vielleicht',
    cell: 'border-amber-300 bg-amber-100 text-amber-900',
    swatch: 'bg-amber-400',
    text: 'text-amber-700',
  },
  no: {
    glyph: '✗',
    label: 'keine Zeit',
    cell: 'border-rose-300 bg-rose-100 text-rose-900',
    swatch: 'bg-rose-500',
    text: 'text-rose-700',
  },
}

export const DAY_STATUSES: DayStatus[] = ['yes', 'maybe', 'no']

// Schraffur für gesperrte Tage
export const HATCH = 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.07) 0 4px, transparent 4px 8px)'

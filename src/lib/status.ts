import type { DayStatus } from './types'

// Zustandsfarben immer mit Glyph, nie nur über Farbe (SPEC: Design-Richtung).
export const STATUS_META: Record<
  DayStatus,
  { glyph: string; label: string; cell: string; swatch: string; text: string }
> = {
  yes: {
    glyph: '✓',
    label: 'kann',
    cell: 'border-yes/50 bg-yes-soft text-ink',
    swatch: 'bg-yes',
    text: 'text-yes',
  },
  maybe: {
    glyph: '~',
    label: 'vielleicht',
    cell: 'border-maybe/50 bg-maybe-soft text-ink',
    swatch: 'bg-maybe',
    text: 'text-maybe',
  },
  no: {
    glyph: '✗',
    label: 'keine Zeit',
    cell: 'border-no/50 bg-no-soft text-ink',
    swatch: 'bg-no',
    text: 'text-no',
  },
}

export const DAY_STATUSES: DayStatus[] = ['yes', 'maybe', 'no']

// Schraffur für gesperrte Tage
export const HATCH =
  'repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 7%, transparent) 0 4px, transparent 4px 8px)'

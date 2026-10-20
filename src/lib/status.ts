import type { DayStatus } from './types'

// Zustandsfarben immer mit Glyph, nie nur über Farbe (SPEC: Design-Richtung).
// text = Schrift (abgedunkelt für Kontrast), swatch = Balken/Punkte,
// soft = zarte Fläche, strong = kräftige Fläche (eigener Eintrag im Malmodus).
export const STATUS_META: Record<
  DayStatus,
  { glyph: string; label: string; soft: string; strong: string; swatch: string; text: string }
> = {
  yes: {
    glyph: '✓',
    label: 'kann',
    soft: 'bg-yes-soft text-ink',
    strong: 'bg-yes text-on-status',
    swatch: 'bg-yes',
    text: 'text-yes-ink',
  },
  maybe: {
    glyph: '~',
    label: 'vielleicht',
    soft: 'bg-maybe-soft text-ink',
    strong: 'bg-maybe text-on-status',
    swatch: 'bg-maybe',
    text: 'text-maybe-ink',
  },
  no: {
    glyph: '✗',
    label: 'keine Zeit',
    soft: 'bg-no-soft text-ink',
    strong: 'bg-no text-on-status',
    swatch: 'bg-no',
    text: 'text-no-ink',
  },
}

export const DAY_STATUSES: DayStatus[] = ['yes', 'maybe', 'no']

// Schraffur für gesperrte Tage
export const HATCH =
  'repeating-linear-gradient(135deg, color-mix(in srgb, var(--ink) 7%, transparent) 0 4px, transparent 4px 8px)'

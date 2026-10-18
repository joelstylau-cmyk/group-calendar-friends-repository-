import { formatDays } from '../lib/dates'
import type { BlockResult } from '../lib/ranking'
import { STATUS_META } from '../lib/status'

export const BLOCK_LENGTHS = [1, 2, 3] as const
export type BlockLength = (typeof BLOCK_LENGTHS)[number]

interface Props {
  length: BlockLength
  onLength: (length: BlockLength) => void
  ranked: BlockResult[]
  total: number
  onOpen: (days: string[]) => void
}

export default function Dashboard({ length, onLength, ranked, total, onOpen }: Props) {
  const [best, ...others] = ranked

  return (
    <section className="space-y-3" aria-label="Beste Termine">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Beste Termine</h3>
        <div className="flex rounded-lg bg-gray-100 p-0.5" role="radiogroup" aria-label="Blocklänge">
          {BLOCK_LENGTHS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={length === l}
              onClick={() => onLength(l)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                length === l ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              {l} {l === 1 ? 'Tag' : 'Tage'}
            </button>
          ))}
        </div>
      </div>

      {!best ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-600">
          {length === 1
            ? 'Noch kein Termin in Sicht. Sobald jemand ✓ oder ~ einträgt, erscheinen hier die besten Tage.'
            : `Noch keine ${length} Tage am Stück, an denen jemand an allen Tagen kann.`}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onOpen(best.days)}
            className="w-full rounded-2xl bg-[#5b6cff] p-5 text-left text-white shadow-md transition active:scale-[0.99]"
          >
            <span className="text-xs font-medium tracking-wide uppercase opacity-80">Aktuell bester Termin</span>
            <span className="mt-1 block text-2xl font-bold">{formatDays(best.days)}</span>
            <span className="mt-2 block text-sm">
              <span className="font-semibold">
                {STATUS_META.yes.glyph} {best.yes.length} von {total} können
              </span>
              {best.maybe.length > 0 && (
                <span className="opacity-90">
                  {' '}
                  · {STATUS_META.maybe.glyph} {best.maybe.length} vielleicht
                </span>
              )}
            </span>
            <span className="mt-1 block text-xs opacity-75">Antippen für Details</span>
          </button>

          {others.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
              {others.map((b) => (
                <li key={b.days[0]}>
                  <button
                    type="button"
                    onClick={() => onOpen(b.days)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium">{formatDays(b.days)}</span>
                    <span className="shrink-0 text-sm">
                      <span className={STATUS_META.yes.text}>
                        {STATUS_META.yes.glyph} {b.yes.length}
                      </span>
                      {b.maybe.length > 0 && (
                        <span className={`ml-2 ${STATUS_META.maybe.text}`}>
                          {STATUS_META.maybe.glyph} {b.maybe.length}
                        </span>
                      )}
                      <span className="ml-2 text-gray-400">›</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

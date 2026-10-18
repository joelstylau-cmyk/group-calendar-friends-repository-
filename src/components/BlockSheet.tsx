import { useEffect } from 'react'
import { formatDays } from '../lib/dates'
import type { BlockResult } from '../lib/ranking'
import { STATUS_META } from '../lib/status'
import type { Member } from '../lib/types'
import Avatar from './Avatar'

interface Props {
  result: BlockResult
  membersById: Map<string, Member>
  userId: string
  onClose: () => void
}

// Bottom-Sheet: wer kann an diesem Tag bzw. Block?
export default function BlockSheet({ result, membersById, userId, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const multi = result.days.length > 1
  const groups = [
    { key: 'yes', title: `${STATUS_META.yes.glyph} Kann`, ids: result.yes, text: STATUS_META.yes.text },
    { key: 'maybe', title: `${STATUS_META.maybe.glyph} Vielleicht`, ids: result.maybe, text: STATUS_META.maybe.text },
    { key: 'no', title: `${STATUS_META.no.glyph} Keine Zeit`, ids: result.no, text: STATUS_META.no.text },
    { key: 'none', title: 'Keine Antwort', ids: result.none, text: 'text-gray-500' },
  ]

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button type="button" aria-label="Schließen" onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-5 pt-5 shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="sheet-title" className="text-lg font-semibold">
              {formatDays(result.days)}
            </h2>
            {multi && (
              <p className="text-sm text-gray-500">
                {result.days.length} Tage am Stück. „Kann“ heißt: an allen {result.days.length} Tagen.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="-mt-1 -mr-2 rounded-full px-3 py-1 text-xl text-gray-500 hover:bg-gray-100"
          >
            ×
          </button>
        </header>

        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className={`mb-1.5 text-sm font-semibold ${g.text}`}>
                {g.title} ({g.ids.length})
              </h3>
              {g.ids.length === 0 ? (
                <p className="text-sm text-gray-400">niemand</p>
              ) : (
                <ul className="space-y-1.5">
                  {g.ids.map((id) => {
                    const member = membersById.get(id)
                    return (
                      <li key={id} className="flex items-center gap-2">
                        {member && <Avatar member={member} size={28} />}
                        <span className="text-sm">
                          {member?.name ?? 'Unbekannt'}
                          {id === userId && <span className="text-gray-500"> (du)</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

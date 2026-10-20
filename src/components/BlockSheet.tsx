import { formatDays } from '../lib/dates'
import type { BlockResult } from '../lib/ranking'
import { STATUS_META } from '../lib/status'
import type { Member } from '../lib/types'
import Avatar from './Avatar'
import Sheet from './Sheet'

interface Props {
  result: BlockResult
  membersById: Map<string, Member>
  userId: string
  onClose: () => void
}

// Bottom-Sheet: wer kann an diesem Tag bzw. Block?
export default function BlockSheet({ result, membersById, userId, onClose }: Props) {
  const multi = result.days.length > 1
  const groups = [
    { key: 'yes', title: `${STATUS_META.yes.glyph} Kann`, ids: result.yes, text: STATUS_META.yes.text },
    { key: 'maybe', title: `${STATUS_META.maybe.glyph} Vielleicht`, ids: result.maybe, text: STATUS_META.maybe.text },
    { key: 'no', title: `${STATUS_META.no.glyph} Keine Zeit`, ids: result.no, text: STATUS_META.no.text },
    { key: 'none', title: 'Keine Antwort', ids: result.none, text: 'text-muted' },
  ]

  return (
    <Sheet
      title={formatDays(result.days)}
      subtitle={
        multi && `${result.days.length} Tage am Stück. „Kann“ heißt: an allen ${result.days.length} Tagen.`
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {groups.map((g) => (
          <section key={g.key}>
            <h3 className={`mb-1.5 text-sm font-semibold ${g.text}`}>
              {g.title} ({g.ids.length})
            </h3>
            {g.ids.length === 0 ? (
              <p className="text-sm text-muted">niemand</p>
            ) : (
              <ul className="space-y-1.5">
                {g.ids.map((id) => {
                  const member = membersById.get(id)
                  return (
                    <li key={id} className="flex items-center gap-2">
                      {member && <Avatar member={member} size={28} />}
                      <span className="text-sm">
                        {member?.name ?? 'Unbekannt'}
                        {id === userId && <span className="text-muted"> (du)</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Sheet>
  )
}

import type { Member } from '../lib/types'
import Avatar from './Avatar'

interface Props {
  members: Member[]
  userId: string
  // Wenn gesetzt: zeigt pro Person, ob sie in der aktuellen Runde geantwortet hat.
  answered?: Set<string>
  target?: number
}

export default function MemberBar({ members, userId, answered, target }: Props) {
  const answeredCount = answered ? members.filter((m) => answered.has(m.user_id)).length : 0

  return (
    <section aria-label="Mitglieder" className="space-y-2">
      <h2 className="text-label">
        {answered
          ? `${answeredCount} von ${target ?? members.length} haben geantwortet`
          : `Mitglieder (${members.length})`}
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-muted">Noch niemand da.</p>
      ) : (
        <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-2">
          {members.map((m) => {
            const hasAnswered = answered?.has(m.user_id) ?? true
            return (
              <li
                key={m.id}
                className={`chip shrink-0 py-1 pr-3 pl-1 ${hasAnswered ? '' : 'bg-surface/60 text-muted shadow-none'}`}
              >
                <span className={`relative ${hasAnswered ? '' : 'opacity-50'}`}>
                  <Avatar member={m} size={26} />
                  {answered && hasAnswered && (
                    <span className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-surface bg-yes text-[7px] font-bold text-on-status">
                      ✓
                    </span>
                  )}
                </span>
                <span className="max-w-28 truncate">
                  {m.name}
                  {m.user_id === userId && <span className="text-muted"> (du)</span>}
                </span>
                {m.role === 'admin' && <span className="text-[10px] font-semibold text-accent">Admin</span>}
                {answered && !hasAnswered && <span className="sr-only">hat noch nicht geantwortet</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

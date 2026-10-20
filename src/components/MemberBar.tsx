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
    <section aria-label="Mitglieder">
      <h2 className="mb-2 text-sm font-medium text-gray-500">
        {answered
          ? `${answeredCount} von ${target ?? members.length} haben geantwortet`
          : `Mitglieder (${members.length})`}
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-gray-500">Noch niemand da.</p>
      ) : (
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pt-1 pb-2">
          {members.map((m) => {
            const hasAnswered = answered?.has(m.user_id) ?? true
            return (
              <li key={m.id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                <span className={`relative ${hasAnswered ? '' : 'opacity-40'}`}>
                  <Avatar member={m} size={44} />
                  {answered && hasAnswered && (
                    <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] font-bold text-white">
                      ✓
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-xs">
                  {m.name}
                  {m.user_id === userId && <span className="text-gray-500"> (du)</span>}
                </span>
                {m.role === 'admin' && <span className="-mt-1 text-[10px] font-medium text-[#5b6cff]">Admin</span>}
                {answered && !hasAnswered && <span className="sr-only">hat noch nicht geantwortet</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

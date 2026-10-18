import type { Member } from '../lib/types'
import Avatar from './Avatar'

export default function MemberBar({ members, clientId }: { members: Member[]; clientId: string }) {
  return (
    <section aria-label="Mitglieder">
      <h2 className="mb-2 text-sm font-medium text-gray-500">
        Mitglieder ({members.length})
      </h2>
      {members.length === 0 ? (
        <p className="text-sm text-gray-500">Noch niemand da.</p>
      ) : (
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
          {members.map((m) => (
            <li key={m.id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
              <Avatar member={m} size={44} />
              <span className="w-full truncate text-xs">
                {m.name}
                {m.client_id === clientId && <span className="text-gray-500"> (du)</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

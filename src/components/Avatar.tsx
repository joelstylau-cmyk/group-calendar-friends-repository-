import type { Member } from '../lib/types'
import { colorForId } from '../lib/colors'

type AvatarPerson = Pick<Member, 'user_id' | 'name' | 'emoji' | 'color'>

export default function Avatar({ member, size = 40 }: { member: AvatarPerson; size?: number }) {
  // Keine Farbe gewählt = automatisch aus der User-ID
  const color = member.color ?? colorForId(member.user_id)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {member.emoji || member.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

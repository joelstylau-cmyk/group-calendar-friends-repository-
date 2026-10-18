import type { Member } from '../lib/types'
import { colorForClientId } from '../lib/colors'

export default function Avatar({ member, size = 40 }: { member: Member; size?: number }) {
  const color = member.color ?? colorForClientId(member.client_id)
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

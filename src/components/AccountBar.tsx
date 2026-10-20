import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../lib/auth'
import { useProfile } from '../lib/profile'
import Avatar from './Avatar'

// Oben rechts: eigenes Profil, führt zu den Settings.
export default function AccountBar() {
  const user = useUser()
  const { profile } = useProfile()
  const { pathname } = useLocation()
  if (pathname === '/settings') return null

  return (
    <div className="mx-auto flex max-w-md justify-end px-4 pt-3">
      <Link
        to="/settings"
        aria-label="Einstellungen"
        className="chip min-h-9 py-1 pr-3 pl-1 hover:bg-surface-2"
      >
        <Avatar member={{ user_id: user.id, ...profile }} size={28} />
        <span className="max-w-40 truncate">{profile.name}</span>
      </Link>
    </div>
  )
}

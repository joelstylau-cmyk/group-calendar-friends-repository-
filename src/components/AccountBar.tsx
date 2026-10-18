import { displayNameOf, signOut, useUser } from '../lib/auth'

// Schmale Leiste: wer ist angemeldet, plus Abmelden (zum Testen mit mehreren Konten).
export default function AccountBar() {
  const user = useUser()
  return (
    <div className="mx-auto flex max-w-md items-center justify-end gap-3 px-4 pt-3 text-xs text-gray-500">
      <span className="truncate">{user.email ?? displayNameOf(user)}</span>
      <button type="button" onClick={() => void signOut()} className="shrink-0 underline">
        Abmelden
      </button>
    </div>
  )
}

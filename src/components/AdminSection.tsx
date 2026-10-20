import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import type { Member } from '../lib/types'
import Avatar from './Avatar'

interface Props {
  groupSlug: string
  groupName: string
  members: Member[]
  userId: string
}

// Nur für Admins: Rollen verwalten und Gruppe löschen.
// Geprüft wird serverseitig (set_member_role, delete_group in 006_admin.sql); hier nur die Oberfläche.
export default function AdminSection({ groupSlug, groupName, members, userId }: Props) {
  const adminCount = members.filter((m) => m.role === 'admin').length
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function setRole(member: Member, role: Member['role']) {
    setBusyId(member.user_id)
    setError(null)
    const { error } = await getSupabase().rpc('set_member_role', {
      p_group_slug: groupSlug,
      p_user_id: member.user_id,
      p_role: role,
    })
    setBusyId(null)
    // Die Mitgliederliste aktualisiert sich per Realtime.
    if (error) setError(`Ändern hat nicht geklappt: ${error.message}`)
  }

  return (
    <section aria-label="Admin" className="space-y-4 border-t border-gray-100 pt-6">
      <div>
        <h2 className="text-sm font-medium text-gray-500">Mitglieder & Admins</h2>
        <p className="text-xs text-gray-500">
          Admins dürfen Runden aller Personen löschen, Admins ernennen und entziehen und die Gruppe löschen.
        </p>
      </div>

      <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200">
        {members.map((m) => {
          const isAdmin = m.role === 'admin'
          const lastAdmin = isAdmin && adminCount <= 1
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar member={m} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.name}
                  {m.user_id === userId && <span className="text-gray-500"> (du)</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {isAdmin ? (lastAdmin ? 'Admin (einziger)' : 'Admin') : 'Mitglied'}
                </p>
              </div>
              {!lastAdmin && (
                <button
                  type="button"
                  onClick={() => void setRole(m, isAdmin ? 'member' : 'admin')}
                  disabled={busyId !== null}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {busyId === m.user_id ? '…' : isAdmin ? 'Admin entziehen' : 'Zum Admin machen'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <DeleteGroup groupSlug={groupSlug} groupName={groupName} />
    </section>
  )
}

function DeleteGroup({ groupSlug, groupName }: { groupSlug: string; groupName: string }) {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setBusy(true)
    setError(null)
    const { error } = await getSupabase().rpc('delete_group', { p_group_slug: groupSlug })
    if (error) {
      setError(`Löschen hat nicht geklappt: ${error.message}`)
      setBusy(false)
      return
    }
    navigate('/')
  }

  if (!confirming) {
    return (
      <div className="text-center">
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-rose-700 underline">
          Gruppe löschen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm">
        „{groupName}“ wirklich für alle löschen? Alle Runden, Verfügbarkeiten und Mitgliedschaften sind dann weg. Das
        lässt sich nicht rückgängig machen.
      </p>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Lösche…' : 'Ja, Gruppe löschen'}
        </button>
      </div>
    </div>
  )
}

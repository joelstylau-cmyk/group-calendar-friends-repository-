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
    <section aria-label="Admin" className="space-y-3 border-t border-line pt-6">
      <div className="space-y-0.5">
        <h2 className="text-label">Mitglieder & Admins</h2>
        <p className="text-xs text-muted">
          Admins dürfen Runden aller Personen löschen, Admins ernennen und entziehen und die Gruppe löschen.
        </p>
      </div>

      <ul className="card divide-y divide-line overflow-hidden">
        {members.map((m) => {
          const isAdmin = m.role === 'admin'
          const lastAdmin = isAdmin && adminCount <= 1
          return (
            <li key={m.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <Avatar member={m} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.name}
                  {m.user_id === userId && <span className="font-normal text-muted"> (du)</span>}
                </p>
                <p className={`text-xs ${isAdmin ? 'font-semibold text-accent' : 'text-muted'}`}>
                  {isAdmin ? (lastAdmin ? 'Admin (einziger)' : 'Admin') : 'Mitglied'}
                </p>
              </div>
              {!lastAdmin && (
                <button
                  type="button"
                  onClick={() => void setRole(m, isAdmin ? 'member' : 'admin')}
                  disabled={busyId !== null}
                  className="btn btn-secondary shrink-0 px-3 text-sm"
                >
                  {busyId === m.user_id ? '…' : isAdmin ? 'Admin entziehen' : 'Zum Admin machen'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="text-sm text-no-ink">{error}</p>}

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
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger text-sm">
          Gruppe löschen
        </button>
      </div>
    )
  }

  return (
    <div className="card space-y-3 border-no/30 bg-no-soft p-4">
      <p className="text-sm">
        „{groupName}“ wirklich für alle löschen? Alle Runden, Verfügbarkeiten und Mitgliedschaften sind dann weg. Das
        lässt sich nicht rückgängig machen.
      </p>
      {error && <p className="text-sm text-no-ink">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="btn btn-secondary flex-1 text-sm"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="btn flex-1 bg-no text-sm text-on-status"
        >
          {busy ? 'Lösche…' : 'Ja, Gruppe löschen'}
        </button>
      </div>
    </div>
  )
}

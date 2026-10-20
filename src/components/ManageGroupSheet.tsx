import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJoinCode } from '../hooks/useJoinCode'
import { formatJoinCode } from '../lib/joinCode'
import { getSupabase } from '../lib/supabase'
import type { Member } from '../lib/types'
import Avatar from './Avatar'
import CopyButton from './CopyButton'
import Sheet from './Sheet'

interface Props {
  groupSlug: string
  groupName: string
  members: Member[]
  userId: string
  onClose: () => void
}

// "Gruppe verwalten": Mitglieder und Admins, Beitritts-Code, Gruppe löschen (Admins), Gruppe verlassen.
// Geprüft wird serverseitig (set_member_role, delete_group in 006_admin.sql, leave_group in 003);
// hier nur die Oberfläche.
export default function ManageGroupSheet({ groupSlug, groupName, members, userId, onClose }: Props) {
  const isAdmin = members.some((m) => m.user_id === userId && m.role === 'admin')

  return (
    <Sheet title="Gruppe verwalten" subtitle={groupName} onClose={onClose}>
      <div className="space-y-6">
        <MemberList groupSlug={groupSlug} members={members} userId={userId} isAdmin={isAdmin} />
        <JoinCodeRow groupSlug={groupSlug} />
        <section aria-label="Gruppe verlassen oder löschen" className="space-y-3 border-t border-line pt-5">
          <LeaveGroup groupSlug={groupSlug} groupName={groupName} members={members} userId={userId} />
          {isAdmin && <DeleteGroup groupSlug={groupSlug} groupName={groupName} />}
        </section>
      </div>
    </Sheet>
  )
}

interface MemberListProps {
  groupSlug: string
  members: Member[]
  userId: string
  isAdmin: boolean
}

function MemberList({ groupSlug, members, userId, isAdmin }: MemberListProps) {
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
    <section aria-label="Mitglieder und Admins" className="space-y-3">
      <div className="space-y-0.5">
        <h3 className="text-label">Mitglieder & Admins ({members.length})</h3>
        <p className="text-xs text-muted">
          Admins dürfen Runden aller Personen bearbeiten und löschen, Admins ernennen und entziehen und die Gruppe
          löschen.
        </p>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-[var(--r-md)] bg-surface-2">
        {members.map((m) => {
          const memberIsAdmin = m.role === 'admin'
          const lastAdmin = memberIsAdmin && adminCount <= 1
          return (
            <li key={m.id} className="flex min-h-14 items-center gap-3 px-3 py-2.5">
              <Avatar member={m} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.name}
                  {m.user_id === userId && <span className="font-normal text-muted"> (du)</span>}
                </p>
                <p className={`text-xs ${memberIsAdmin ? 'font-semibold text-accent' : 'text-muted'}`}>
                  {memberIsAdmin ? (lastAdmin ? 'Admin (einziger)' : 'Admin') : 'Mitglied'}
                </p>
              </div>
              {isAdmin && !lastAdmin && (
                <button
                  type="button"
                  onClick={() => void setRole(m, memberIsAdmin ? 'member' : 'admin')}
                  disabled={busyId !== null}
                  className="btn shrink-0 bg-surface px-3 text-sm text-ink shadow-[var(--shadow-card)]"
                >
                  {busyId === m.user_id ? '…' : memberIsAdmin ? 'Admin entziehen' : 'Zum Admin machen'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="text-sm text-no-ink">{error}</p>}
    </section>
  )
}

function JoinCodeRow({ groupSlug }: { groupSlug: string }) {
  const { code, error } = useJoinCode(groupSlug)
  const formatted = code ? formatJoinCode(code) : null

  if (error) return <p className="text-sm text-no-ink">Beitritts-Code laden fehlgeschlagen: {error}</p>

  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] bg-surface-2 py-2 pr-2 pl-4">
      <div className="min-w-0">
        <p className="text-label">Beitritts-Code</p>
        <p className="font-mono text-base font-semibold tracking-widest">{formatted ?? '…'}</p>
      </div>
      <CopyButton text={formatted} className="shrink-0" />
    </div>
  )
}

interface LeaveGroupProps {
  groupSlug: string
  groupName: string
  members: Member[]
  userId: string
}

function LeaveGroup({ groupSlug, groupName, members, userId }: LeaveGroupProps) {
  const navigate = useNavigate()
  const others = members.filter((m) => m.user_id !== userId)
  const iAmLastAdmin =
    members.some((m) => m.user_id === userId && m.role === 'admin') &&
    !others.some((m) => m.role === 'admin')
  // members ist nach Beitritt sortiert; die Datenbank wählt genauso (siehe 006_admin.sql).
  const successor = iAmLastAdmin ? others[0] : undefined
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLeave() {
    setBusy(true)
    setError(null)
    // Mitgliedschaft und eigene Verfügbarkeiten in einem Schritt (siehe 003_leave_group.sql)
    const { error } = await getSupabase().rpc('leave_group', { p_group_slug: groupSlug })
    if (error) {
      setError(`Verlassen hat nicht geklappt: ${error.message}`)
      setBusy(false)
      return
    }
    navigate('/')
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger w-full text-sm">
        Gruppe verlassen
      </button>
    )
  }

  return (
    <div className="card space-y-3 border-no/30 bg-no-soft p-4">
      {others.length === 0 ? (
        <p className="text-sm">
          „{groupName}“ wirklich verlassen? Du bist das letzte Mitglied, die Gruppe wird dann mit allen Runden
          gelöscht.
        </p>
      ) : (
        <p className="text-sm">
          „{groupName}“ wirklich verlassen? Deine Verfügbarkeiten in allen Runden dieser Gruppe werden gelöscht. Über
          den Link oder den Beitritts-Code kannst du später wieder beitreten.
          {successor && ` Da sonst niemand Admin ist, wird ${successor.name} neuer Admin.`}
        </p>
      )}
      {error && <p className="text-sm text-no-ink">{error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary flex-1 text-sm">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleLeave}
          disabled={busy}
          className="btn flex-1 bg-no text-sm text-on-status"
        >
          {busy ? 'Verlasse…' : 'Ja, verlassen'}
        </button>
      </div>
    </div>
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
      <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger w-full text-sm">
        Gruppe löschen
      </button>
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
        <button type="button" onClick={() => setConfirming(false)} className="btn btn-secondary flex-1 text-sm">
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

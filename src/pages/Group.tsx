import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminSection from '../components/AdminSection'
import JoinCodeCard from '../components/JoinCodeCard'
import JoinForm from '../components/JoinForm'
import RoundsSection from '../components/RoundsSection'
import ShareButton from '../components/ShareButton'
import { useMembers } from '../hooks/useMembers'
import { useUser } from '../lib/auth'
import { getSupabase } from '../lib/supabase'
import type { Group as GroupRow, Member } from '../lib/types'

type GroupState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'gone' } // war gerade noch da, wurde inzwischen gelöscht
  | { kind: 'error'; message: string }
  | { kind: 'ready'; group: GroupRow }

export default function Group() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<GroupState>({ kind: 'loading' })
  // Hochzählen lädt die Gruppe neu (z.B. wenn die eigene Mitgliedschaft verschwindet)
  const [recheck, setRecheck] = useState(0)
  const onMembershipLost = useCallback(() => setRecheck((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    // Über die Funktion get_group, weil Nicht-Mitglieder die Tabelle groups nicht lesen dürfen.
    getSupabase()
      .rpc('get_group', { p_slug: slug })
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setState({ kind: 'error', message: error.message })
        else if (!data) setState({ kind: recheck > 0 ? 'gone' : 'notfound' })
        else setState({ kind: 'ready', group: data as GroupRow })
      })
    return () => {
      cancelled = true
    }
  }, [slug, recheck])

  if (state.kind === 'loading') {
    return <CenteredMessage>Lade Gruppe…</CenteredMessage>
  }
  if (state.kind === 'notfound') {
    return (
      <CenteredMessage>
        <p className="text-4xl">🤷</p>
        <h1 className="text-xl font-semibold">Diese Gruppe gibt es nicht</h1>
        <p className="text-muted">
          Vielleicht ist der Link unvollständig. Frag am besten nochmal nach dem richtigen Link.
        </p>
        <Link to="/" className="inline-block text-accent underline">
          Eigene Gruppe anlegen
        </Link>
      </CenteredMessage>
    )
  }
  if (state.kind === 'gone') {
    return (
      <CenteredMessage>
        <p className="text-4xl">🗑️</p>
        <h1 className="text-xl font-semibold">Diese Gruppe wurde gelöscht</h1>
        <p className="text-muted">Ein Admin hat die Gruppe samt allen Runden gelöscht.</p>
        <Link to="/" className="inline-block text-accent underline">
          Zu deinen Gruppen
        </Link>
      </CenteredMessage>
    )
  }
  if (state.kind === 'error') {
    return (
      <CenteredMessage>
        <h1 className="text-xl font-semibold">Da ist was schiefgelaufen</h1>
        <p className="text-sm text-no">{state.message}</p>
      </CenteredMessage>
    )
  }
  return <GroupView group={state.group} onMembershipLost={onMembershipLost} />
}

function GroupView({ group, onMembershipLost }: { group: GroupRow; onMembershipLost: () => void }) {
  const userId = useUser().id
  const { members, loaded, error, reload } = useMembers(group.slug)
  const me = members.find((m) => m.user_id === userId)
  const isMember = Boolean(me)

  // Eben noch Mitglied, jetzt nicht mehr (Gruppe von einem Admin gelöscht, oder entfernt):
  // Gruppe neu nachschlagen, damit statt des Beitreten-Formulars die passende Seite kommt.
  const wasMember = useRef(false)
  useEffect(() => {
    if (!loaded) return
    if (wasMember.current && !isMember) onMembershipLost()
    wasMember.current = isMember
  }, [loaded, isMember, onMembershipLost])

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <Link to="/" className="inline-block text-sm text-accent">
        ‹ Deine Gruppen
      </Link>
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold break-words">{group.name}</h1>
        <ShareButton url={window.location.href} />
      </header>

      {error && <p className="text-sm text-no">Mitglieder laden fehlgeschlagen: {error}</p>}

      {!loaded ? (
        <p className="text-muted">Lade Mitglieder…</p>
      ) : isMember ? (
        <>
          <JoinCodeCard groupSlug={group.slug} />
          <RoundsSection groupSlug={group.slug} members={members} userId={userId} />
          {me?.role === 'admin' && (
            <AdminSection groupSlug={group.slug} groupName={group.name} members={members} userId={userId} />
          )}
          <LeaveGroup groupSlug={group.slug} groupName={group.name} members={members} userId={userId} />
        </>
      ) : (
        <JoinForm groupSlug={group.slug} groupName={group.name} onJoined={reload} />
      )}
    </main>
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
      <div className="border-t border-line pt-6 text-center">
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-no underline">
          Gruppe verlassen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-no/30 bg-no-soft p-4">
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
      {error && <p className="text-sm text-no">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-lg border border-faint/50 bg-surface px-3 py-2 text-sm font-medium"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleLeave}
          disabled={busy}
          className="flex-1 rounded-lg bg-no px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-50"
        >
          {busy ? 'Verlasse…' : 'Ja, verlassen'}
        </button>
      </div>
    </div>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">{children}</main>
}

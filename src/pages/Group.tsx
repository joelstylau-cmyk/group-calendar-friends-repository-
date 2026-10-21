import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import JoinForm from '../components/JoinForm'
import ManageGroupSheet from '../components/ManageGroupSheet'
import RoundsSection from '../components/RoundsSection'
import ShareSheet from '../components/ShareSheet'
import { useMembers } from '../hooks/useMembers'
import { useUser } from '../lib/auth'
import { getSupabase } from '../lib/supabase'
import type { Group as GroupRow } from '../lib/types'

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
        <p className="text-sm text-no-ink">{state.message}</p>
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
  const [sheet, setSheet] = useState<'share' | 'manage' | null>(null)
  const closeSheet = useCallback(() => setSheet(null), [])
  const [groupName, setGroupName] = useLiveGroupName(group.slug, group.name)

  // Eben noch Mitglied, jetzt nicht mehr (Gruppe von einem Admin gelöscht, oder entfernt):
  // Gruppe neu nachschlagen, damit statt des Beitreten-Formulars die passende Seite kommt.
  const wasMember = useRef(false)
  useEffect(() => {
    if (!loaded) return
    if (wasMember.current && !isMember) onMembershipLost()
    wasMember.current = isMember
  }, [loaded, isMember, onMembershipLost])

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 pt-2 pb-8">
      <header className="space-y-3">
        <Link to="/" className="-ml-1 inline-flex min-h-9 items-center rounded-full px-1 text-small text-muted hover:text-ink">
          ‹ Deine Gruppen
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-display min-w-0 break-words">{groupName}</h1>
          {isMember && (
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setSheet('share')} className="btn btn-outline px-4 text-sm">
                Teilen
              </button>
              <button
                type="button"
                onClick={() => setSheet('manage')}
                aria-label="Gruppe verwalten"
                title="Gruppe verwalten"
                className="btn btn-ghost -mr-2 w-11 px-0"
              >
                <GearIcon />
              </button>
            </div>
          )}
        </div>
      </header>

      {error && <p className="text-sm text-no-ink">Mitglieder laden fehlgeschlagen: {error}</p>}

      {!loaded ? (
        <p className="text-muted">Lade Mitglieder…</p>
      ) : isMember ? (
        <RoundsSection groupSlug={group.slug} members={members} userId={userId} />
      ) : (
        <JoinForm groupSlug={group.slug} groupName={groupName} onJoined={reload} />
      )}

      {isMember && sheet === 'share' && (
        <ShareSheet groupSlug={group.slug} groupName={groupName} url={window.location.href} onClose={closeSheet} />
      )}
      {isMember && sheet === 'manage' && (
        <ManageGroupSheet
          groupSlug={group.slug}
          groupName={groupName}
          members={members}
          userId={userId}
          onRenamed={setGroupName}
          onClose={closeSheet}
        />
      )}
    </main>
  )
}

// Gruppenname live: Umbenennen (rename_group, 008) kommt per Realtime bei allen offenen Seiten an.
// RLS (groups_select) lässt dabei nur Mitglieder die Änderung sehen.
function useLiveGroupName(slug: string, initial: string) {
  const [name, setName] = useState(initial)

  useEffect(() => {
    const supabase = getSupabase()
    const channel = supabase
      .channel(`groups:${slug}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups', filter: `slug=eq.${slug}` }, (payload) => {
        const next = (payload.new as { name?: string }).name
        if (next) setName(next)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [slug])

  return [name, setName] as const
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">{children}</main>
}

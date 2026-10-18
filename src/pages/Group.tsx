import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import JoinForm from '../components/JoinForm'
import MemberBar from '../components/MemberBar'
import RoundsSection from '../components/RoundsSection'
import ShareButton from '../components/ShareButton'
import { useMembers } from '../hooks/useMembers'
import { getClientId } from '../lib/clientId'
import { getSupabase } from '../lib/supabase'
import type { Group as GroupRow } from '../lib/types'

type GroupState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; group: GroupRow }

export default function Group() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<GroupState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ kind: 'loading' })
    getSupabase()
      .from('groups')
      .select('slug, name, created_at')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setState({ kind: 'error', message: error.message })
        else if (!data) setState({ kind: 'notfound' })
        else setState({ kind: 'ready', group: data as GroupRow })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (state.kind === 'loading') {
    return <CenteredMessage>Lade Gruppe…</CenteredMessage>
  }
  if (state.kind === 'notfound') {
    return (
      <CenteredMessage>
        <p className="text-4xl">🤷</p>
        <h1 className="text-xl font-semibold">Diese Gruppe gibt es nicht</h1>
        <p className="text-gray-600">
          Vielleicht ist der Link unvollständig. Frag am besten nochmal nach dem richtigen Link.
        </p>
        <Link to="/" className="inline-block text-[#5b6cff] underline">
          Eigene Gruppe anlegen
        </Link>
      </CenteredMessage>
    )
  }
  if (state.kind === 'error') {
    return (
      <CenteredMessage>
        <h1 className="text-xl font-semibold">Da ist was schiefgelaufen</h1>
        <p className="text-sm text-rose-700">{state.message}</p>
      </CenteredMessage>
    )
  }
  return <GroupView group={state.group} />
}

function GroupView({ group }: { group: GroupRow }) {
  const clientId = getClientId()
  const { members, loaded, error, reload } = useMembers(group.slug)
  const isMember = members.some((m) => m.client_id === clientId)

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold break-words">{group.name}</h1>
        <ShareButton url={window.location.href} />
      </header>

      {error && <p className="text-sm text-rose-700">Mitglieder laden fehlgeschlagen: {error}</p>}

      {!loaded ? (
        <p className="text-gray-500">Lade Mitglieder…</p>
      ) : isMember ? (
        <>
          <MemberBar members={members} clientId={clientId} />
          <RoundsSection groupSlug={group.slug} members={members} clientId={clientId} />
        </>
      ) : (
        <JoinForm
          groupSlug={group.slug}
          groupName={group.name}
          clientId={clientId}
          onJoined={reload}
        />
      )}
    </main>
  )
}

function CenteredMessage({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">{children}</main>
}

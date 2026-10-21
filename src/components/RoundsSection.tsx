import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRounds } from '../hooks/useRounds'
import { formatRange } from '../lib/dates'
import type { Member, Round } from '../lib/types'
import MemberBar from './MemberBar'
import RoundForm from './RoundForm'
import RoundView from './RoundView'

interface Props {
  groupSlug: string
  members: Member[]
  userId: string
}

// Standard-Runde: die neueste offene, sonst die neueste überhaupt
function defaultRound(rounds: Round[]): Round | undefined {
  const open = rounds.filter((r) => r.status === 'open')
  return (open.length ? open : rounds).at(-1)
}

export default function RoundsSection({ groupSlug, members, userId }: Props) {
  const { rounds, loaded, error, reload } = useRounds(groupSlug)
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(false)

  // Gewählte Runde steht in der URL (?r=<id>), damit ein geteilter Link direkt auf sie zeigt.
  const selected = rounds.find((r) => r.id === params.get('r')) ?? defaultRound(rounds)

  function select(id: string | null) {
    setParams(id ? { r: id } : {}, { replace: true })
  }

  if (creating) {
    return (
      <RoundForm
        mode="create"
        groupSlug={groupSlug}
        userId={userId}
        onCancel={() => setCreating(false)}
        onDone={(id) => {
          setCreating(false)
          select(id)
          void reload()
        }}
      />
    )
  }

  return (
    <section className="space-y-4" aria-label="Runden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-label">Runden</h2>
        <button type="button" onClick={() => setCreating(true)} className="btn btn-primary px-4 text-sm">
          + Neue Runde
        </button>
      </div>

      {error && <p className="text-sm text-no-ink">Runden laden fehlgeschlagen: {error}</p>}

      {!loaded ? (
        <p className="text-muted">Lade Runden…</p>
      ) : !selected ? (
        <>
          <MemberBar members={members} userId={userId} />
          <div className="card p-6 text-center text-muted">
            <p className="text-3xl">🗓️</p>
            <p className="mt-2">Noch keine Runde. Leg die erste an, z.B. für den nächsten Ausflug.</p>
          </div>
        </>
      ) : (
        <>
          {rounds.length > 1 && (
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-2">
              {rounds.map((r) => {
                const active = r.id === selected.id
                return (
                  <li key={r.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      aria-pressed={active}
                      className={`rounded-[var(--r-md)] px-3 py-2 text-left transition-colors ${
                        active
                          ? 'bg-accent-soft text-ink ring-2 ring-accent'
                          : 'bg-surface shadow-[var(--shadow-card)] hover:bg-paper'
                      }`}
                    >
                      <span className="block max-w-40 truncate text-sm font-medium">{r.title}</span>
                      <span className="block text-xs text-muted">{formatRange(r.start_date, r.end_date)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <RoundView
            key={selected.id}
            round={selected}
            members={members}
            userId={userId}
            onDeleted={() => {
              select(null)
              void reload()
            }}
            onEdited={() => void reload()}
          />
        </>
      )}
    </section>
  )
}

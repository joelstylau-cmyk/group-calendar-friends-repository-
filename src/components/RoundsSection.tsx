import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRounds } from '../hooks/useRounds'
import { formatRange } from '../lib/dates'
import type { Member, Round } from '../lib/types'
import CreateRoundForm from './CreateRoundForm'
import RoundView from './RoundView'

interface Props {
  groupSlug: string
  members: Member[]
  clientId: string
}

// Standard-Runde: die neueste offene, sonst die neueste überhaupt
function defaultRound(rounds: Round[]): Round | undefined {
  const open = rounds.filter((r) => r.status === 'open')
  return (open.length ? open : rounds).at(-1)
}

export default function RoundsSection({ groupSlug, members, clientId }: Props) {
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
      <CreateRoundForm
        groupSlug={groupSlug}
        clientId={clientId}
        onCancel={() => setCreating(false)}
        onCreated={(id) => {
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
        <h2 className="text-sm font-medium text-gray-500">Runden</h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-[#5b6cff] px-3 py-1.5 text-sm font-medium text-white"
        >
          + Neue Runde
        </button>
      </div>

      {error && <p className="text-sm text-rose-700">Runden laden fehlgeschlagen: {error}</p>}

      {!loaded ? (
        <p className="text-gray-500">Lade Runden…</p>
      ) : !selected ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
          Noch keine Runde. Leg die erste an, z.B. für den nächsten Ausflug.
        </div>
      ) : (
        <>
          {rounds.length > 1 && (
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {rounds.map((r) => {
                const active = r.id === selected.id
                return (
                  <li key={r.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2 text-left ${
                        active ? 'border-[#5b6cff] bg-[#5b6cff]/10' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="block max-w-40 truncate text-sm font-medium">{r.title}</span>
                      <span className="block text-xs text-gray-500">{formatRange(r.start_date, r.end_date)}</span>
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
            clientId={clientId}
            onDeleted={() => {
              select(null)
              void reload()
            }}
          />
        </>
      )}
    </section>
  )
}

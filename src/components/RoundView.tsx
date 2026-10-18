import { useState } from 'react'
import { dayCount, formatRange } from '../lib/dates'
import { getSupabase } from '../lib/supabase'
import type { Member, Round } from '../lib/types'
import AvailabilitySection from './AvailabilitySection'

interface Props {
  round: Round
  members: Member[]
  clientId: string
  onDeleted: () => void
}

export default function RoundView({ round, members, clientId, onDeleted }: Props) {
  const creator = members.find((m) => m.client_id === round.created_by)
  const isCreator = round.created_by === clientId
  const days = dayCount(round.start_date, round.end_date)
  const excludedCount = round.excluded_dates.length

  return (
    <article className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold break-words">{round.title}</h2>
        <p className="text-gray-700">{formatRange(round.start_date, round.end_date)}</p>
        <p className="text-sm text-gray-500">
          {days} {days === 1 ? 'Tag' : 'Tage'}
          {excludedCount > 0 && `, davon ${excludedCount} gesperrt`}
          {round.headcount !== null && ` · Gruppengröße ${round.headcount}`}
          {creator && ` · angelegt von ${isCreator ? 'dir' : creator.name}`}
        </p>
      </header>

      <AvailabilitySection round={round} clientId={clientId} />

      {isCreator && <DeleteRound roundId={round.id} onDeleted={onDeleted} />}
    </article>
  )
}

function DeleteRound({ roundId, onDeleted }: { roundId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setBusy(true)
    setError(null)
    const { error } = await getSupabase().from('rounds').delete().eq('id', roundId)
    setBusy(false)
    if (error) {
      setError(`Löschen hat nicht geklappt: ${error.message}`)
      return
    }
    setConfirming(false)
    onDeleted()
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-rose-700 underline"
      >
        Runde löschen
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <p className="text-sm">
        Runde wirklich löschen? Alle eingetragenen Verfügbarkeiten gehen dabei verloren.
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
          {busy ? 'Lösche…' : 'Ja, löschen'}
        </button>
      </div>
    </div>
  )
}

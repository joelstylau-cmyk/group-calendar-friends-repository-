import { useCallback, useMemo, useState } from 'react'
import { useAvailabilityDraft } from '../hooks/useAvailabilityDraft'
import { useLiveRows } from '../hooks/useLiveRows'
import { dayCount, daysInRange, formatRange } from '../lib/dates'
import { bestOverall, classifyBlock, rankByLength } from '../lib/ranking'
import { getSupabase } from '../lib/supabase'
import type { Availability, DayMap, Member, Round } from '../lib/types'
import AvailabilitySection from './AvailabilitySection'
import BlockSheet from './BlockSheet'
import Dashboard, { type LengthRange } from './Dashboard'
import MemberBar from './MemberBar'

interface Props {
  round: Round
  members: Member[]
  clientId: string
  onDeleted: () => void
}

export default function RoundView({ round, members, clientId, onDeleted }: Props) {
  const { rows, loaded, error } = useLiveRows<Availability>('availability', 'round_id', round.id, 'updated_at')
  const myRow = rows.find((r) => r.client_id === clientId)
  const draft = useAvailabilityDraft(round.id, clientId, loaded ? (myRow?.days ?? {}) : null)
  const [sheetDays, setSheetDays] = useState<string[] | null>(null)
  const closeSheet = useCallback(() => setSheetDays(null), [])

  const windowDays = useMemo(() => daysInRange(round.start_date, round.end_date), [round.start_date, round.end_date])
  const [lengthRange, setLengthRange] = useState<LengthRange>(() => ({ min: 1, max: Math.min(3, windowDays.length) }))
  const excluded = useMemo(() => new Set(round.excluded_dates), [round.excluded_dates])
  const openDays = windowDays.filter((d) => !excluded.has(d))

  // Alle Einträge; mein eigener kommt aus dem lokalen Entwurf, damit alles sofort mitzieht.
  const entries = new Map<string, DayMap>(rows.map((r) => [r.client_id, r.days]))
  entries.set(clientId, draft.days)
  const membersById = new Map(members.map((m) => [m.client_id, m]))
  // Personen = Mitglieder plus evtl. Einträge von Geräten ohne Mitgliedszeile
  const people = [...new Set([...members.map((m) => m.client_id), ...rows.map((r) => r.client_id)])]

  const answered = new Set(people.filter((p) => openDays.some((d) => entries.get(p)?.[d])))
  const dayStats = Object.fromEntries(openDays.map((d) => [d, classifyBlock([d], people, entries)]))
  const byLength = rankByLength(windowDays, excluded, lengthRange.min, lengthRange.max, people, entries)
  const best = bestOverall(byLength)
  const highlight = new Set(best?.days ?? [])

  const creator = membersById.get(round.created_by ?? '')
  const isCreator = round.created_by === clientId
  const days = dayCount(round.start_date, round.end_date)

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold break-words">{round.title}</h2>
        <p className="text-gray-700">{formatRange(round.start_date, round.end_date)}</p>
        <p className="text-sm text-gray-500">
          {days} {days === 1 ? 'Tag' : 'Tage'}
          {excluded.size > 0 && `, davon ${excluded.size} gesperrt`}
          {round.headcount !== null && ` · Gruppengröße ${round.headcount}`}
          {creator && ` · angelegt von ${isCreator ? 'dir' : creator.name}`}
        </p>
      </header>

      <MemberBar
        members={members}
        clientId={clientId}
        answered={answered}
        target={round.headcount ?? members.length}
      />

      {error && <p className="text-sm text-rose-700">Verfügbarkeiten laden fehlgeschlagen: {error}</p>}

      {!loaded || !draft.ready ? (
        <p className="text-gray-500">Lade Verfügbarkeiten…</p>
      ) : (
        <>
          <Dashboard
            range={lengthRange}
            maxLength={windowDays.length}
            onRange={setLengthRange}
            results={byLength}
            best={best}
            total={people.length}
            onOpen={setSheetDays}
          />
          <AvailabilitySection
            round={round}
            openDays={openDays}
            myDays={draft.days}
            saveStatus={draft.status}
            onPaint={draft.update}
            onRetry={draft.retry}
            dayStats={dayStats}
            total={people.length}
            highlight={highlight}
            onDayTap={(iso) => setSheetDays([iso])}
          />
        </>
      )}

      {isCreator && <DeleteRound roundId={round.id} onDeleted={onDeleted} />}

      {sheetDays && (
        <BlockSheet
          result={classifyBlock(sheetDays, people, entries)}
          membersById={membersById}
          clientId={clientId}
          onClose={closeSheet}
        />
      )}
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

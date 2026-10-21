import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useAvailabilityDraft } from '../hooks/useAvailabilityDraft'
import { useLiveRows } from '../hooks/useLiveRows'
import { dayCount, daysInRange, formatRange } from '../lib/dates'
import { classifyBlock, rankInRange } from '../lib/ranking'
import { getSupabase } from '../lib/supabase'
import type { Availability, DayMap, Member, Round } from '../lib/types'
import AvailabilitySection from './AvailabilitySection'
import BlockSheet from './BlockSheet'
import Dashboard, { type LengthRange } from './Dashboard'
import MemberBar from './MemberBar'
import RoundForm from './RoundForm'

interface Props {
  round: Round
  members: Member[]
  userId: string
  onDeleted: () => void
  onEdited: () => void
}

export default function RoundView({ round, members, userId, onDeleted, onEdited }: Props) {
  const [editing, setEditing] = useState(false)
  const { rows, loaded, error } = useLiveRows<Availability>('availability', 'round_id', round.id, {
    orderBy: 'updated_at',
  })
  const myRow = rows.find((r) => r.user_id === userId)
  const draft = useAvailabilityDraft(round.id, userId, loaded ? (myRow?.days ?? {}) : null)
  const [sheetDays, setSheetDays] = useState<string[] | null>(null)
  const closeSheet = useCallback(() => setSheetDays(null), [])

  // Verfügbarkeit malen: Solange gemalt wird, ist "Beste Termine" eingeklappt. Sonst ändert es
  // bei jedem Strich seine Höhe und der Kalender darunter rutscht unter dem Finger weg.
  const [painting, setPainting] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const calendarTopBefore = useRef<number | null>(null)

  function changePainting(next: boolean) {
    // Kalender beim Ein-/Ausklappen an derselben Bildschirmstelle halten
    calendarTopBefore.current = calendarRef.current?.getBoundingClientRect().top ?? null
    setPainting(next)
  }

  useLayoutEffect(() => {
    const before = calendarTopBefore.current
    calendarTopBefore.current = null
    const after = calendarRef.current?.getBoundingClientRect().top
    if (before !== null && after !== undefined && after !== before) window.scrollBy(0, after - before)
  }, [painting])

  const windowDays = useMemo(() => daysInRange(round.start_date, round.end_date), [round.start_date, round.end_date])
  const [chosenRange, setLengthRange] = useState<LengthRange>(() => ({ min: 1, max: Math.min(3, windowDays.length) }))
  // Nach dem Verkleinern des Fensters darf die Spanne nicht länger als das Fenster sein
  const lengthRange: LengthRange = {
    min: Math.min(chosenRange.min, windowDays.length),
    max: Math.min(chosenRange.max, windowDays.length),
  }
  const excluded = useMemo(() => new Set(round.excluded_dates), [round.excluded_dates])
  const openDays = windowDays.filter((d) => !excluded.has(d))

  // Alle Einträge; mein eigener kommt aus dem lokalen Entwurf, damit alles sofort mitzieht.
  const entries = new Map<string, DayMap>(rows.map((r) => [r.user_id, r.days]))
  entries.set(userId, draft.days)
  const membersById = new Map(members.map((m) => [m.user_id, m]))
  // Personen = Mitglieder plus evtl. Einträge von Geräten ohne Mitgliedszeile
  const people = [...new Set([...members.map((m) => m.user_id), ...rows.map((r) => r.user_id)])]

  const answered = new Set(people.filter((p) => openDays.some((d) => entries.get(p)?.[d])))
  const dayStats = Object.fromEntries(openDays.map((d) => [d, classifyBlock([d], people, entries)]))
  const ranking = rankInRange(windowDays, excluded, lengthRange.min, lengthRange.max, people, entries)
  const highlight = new Set(ranking.blocks[0]?.days ?? [])

  const creator = membersById.get(round.created_by ?? '')
  const isCreator = round.created_by === userId
  // Gleiche Regel wie rounds_delete/rounds_update in der Datenbank: Ersteller ODER Admin
  const canManage = isCreator || membersById.get(userId)?.role === 'admin'
  const days = dayCount(round.start_date, round.end_date)

  if (editing) {
    return (
      <RoundForm
        mode="edit"
        round={round}
        entries={entries}
        onCancel={() => setEditing(false)}
        onDone={() => {
          setEditing(false)
          onEdited()
        }}
      />
    )
  }

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-headline break-words">{round.title}</h2>
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn btn-ghost -mr-2 shrink-0 px-3 text-sm text-accent-ink"
            >
              Bearbeiten
            </button>
          )}
        </div>
        <p className="font-semibold text-ink">{formatRange(round.start_date, round.end_date)}</p>
        <p className="text-small text-muted">
          {days} {days === 1 ? 'Tag' : 'Tage'}
          {excluded.size > 0 && `, davon ${excluded.size} gesperrt`}
          {round.headcount !== null && ` · Gruppengröße ${round.headcount}`}
          {creator && ` · angelegt von ${isCreator ? 'dir' : creator.name}`}
        </p>
      </header>

      <MemberBar
        members={members}
        userId={userId}
        answered={answered}
        target={round.headcount ?? members.length}
      />

      {error && <p className="text-sm text-no-ink">Verfügbarkeiten laden fehlgeschlagen: {error}</p>}

      {!loaded || !draft.ready ? (
        <p className="text-muted">Lade Verfügbarkeiten…</p>
      ) : (
        <>
          {painting ? (
            <p className="rounded-[var(--r-md)] bg-surface-2 px-4 py-3 text-small text-muted">
              <span className="font-semibold text-ink">Beste Termine</span> sind beim Eintragen eingeklappt und erscheinen nach „Fertig“ wieder.
            </p>
          ) : (
            <Dashboard
              range={lengthRange}
              maxLength={windowDays.length}
              onRange={setLengthRange}
              ranking={ranking}
              total={people.length}
              onOpen={setSheetDays}
            />
          )}
          <div ref={calendarRef}>
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
              editing={painting}
              onEditingChange={changePainting}
            />
          </div>
        </>
      )}

      {canManage && <DeleteRound roundId={round.id} onDeleted={onDeleted} />}

      {sheetDays && (
        <BlockSheet
          result={classifyBlock(sheetDays, people, entries)}
          membersById={membersById}
          userId={userId}
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
      <div className="text-center">
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger text-sm">
          Runde löschen
        </button>
      </div>
    )
  }

  return (
    <div className="card space-y-3 border-no/30 bg-no-soft p-4">
      <p className="text-sm">
        Runde wirklich löschen? Alle eingetragenen Verfügbarkeiten gehen dabei verloren.
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
          {busy ? 'Lösche…' : 'Ja, löschen'}
        </button>
      </div>
    </div>
  )
}

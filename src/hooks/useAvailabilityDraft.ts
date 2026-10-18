import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import type { DayMap, DayStatus } from '../lib/types'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const DEBOUNCE_MS = 800

// Meine Verfügbarkeit einer Runde: lokaler Entwurf, der debounced gespeichert wird.
// Nach dem ersten Laden ist der lokale Stand maßgeblich; Realtime-Echos der eigenen
// Speicherungen überschreiben ihn nicht.
// `initial` ist null, solange die Daten vom Server noch nicht geladen sind.
export function useAvailabilityDraft(roundId: string, userId: string, initial: DayMap | null) {
  const [days, setDays] = useState<DayMap>({})
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('idle')

  const daysRef = useRef<DayMap>({})
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const saveRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    if (ready || initial === null) return
    daysRef.current = initial
    setDays(initial)
    setReady(true)
  }, [initial, ready])

  useEffect(() => {
    saveRef.current = async () => {
      // Läuft schon eine Speicherung, holt sie neue Änderungen danach selbst nach.
      if (savingRef.current || !dirtyRef.current) return
      savingRef.current = true
      dirtyRef.current = false
      setStatus('saving')
      const { error } = await getSupabase()
        .from('availability')
        .upsert(
          { round_id: roundId, user_id: userId, days: daysRef.current, updated_at: new Date().toISOString() },
          { onConflict: 'round_id,user_id' },
        )
      savingRef.current = false
      if (error) {
        dirtyRef.current = true
        setStatus('error')
      } else if (dirtyRef.current) {
        void saveRef.current()
      } else {
        setStatus('saved')
      }
    }
  }, [roundId, userId])

  const update = useCallback((changes: Record<string, DayStatus | null>) => {
    const next = { ...daysRef.current }
    for (const [iso, value] of Object.entries(changes)) {
      if (value) next[iso] = value
      else delete next[iso]
    }
    daysRef.current = next
    setDays(next)
    dirtyRef.current = true
    setStatus('pending')
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => void saveRef.current(), DEBOUNCE_MS)
  }, [])

  const retry = useCallback(() => void saveRef.current(), [])

  // Offene Änderungen sofort speichern, wenn die Seite verlassen oder in den
  // Hintergrund geschickt wird (Handy: App-Wechsel), und beim Unmount.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current) return
      window.clearTimeout(timerRef.current)
      void saveRef.current()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    // Beim Neuladen mit ungespeicherten Änderungen nachfragen, die Anfrage könnte sonst abbrechen.
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || savingRef.current) {
        flush()
        e.preventDefault()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', onBeforeUnload)
      flush()
    }
  }, [])

  return { days, ready, status, update, retry }
}

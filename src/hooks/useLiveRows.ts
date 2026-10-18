import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase } from '../lib/supabase'

interface LiveRowsState<T> {
  rows: T[]
  loaded: boolean
  error: string | null
  reload: () => Promise<void>
}

interface LiveRowsOptions {
  orderBy?: string
  // PostgREST-Select, z.B. mit eingebetteter Verknüpfung
  select?: string
  // Weitere Tabelle, deren Änderungen ebenfalls ein Neuladen auslösen (z.B. eingebettete Profile)
  alsoWatch?: string
}

// Lädt alle Zeilen einer Tabelle mit `column = value` und hält sie per Realtime aktuell.
export function useLiveRows<T extends { id: string }>(
  table: string,
  column: string,
  value: string,
  { orderBy = 'created_at', select = '*', alsoWatch }: LiveRowsOptions = {},
): LiveRowsState<T> {
  const [rows, setRows] = useState<T[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idsRef = useRef<Set<string>>(new Set())

  const reload = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from(table)
      .select(select)
      .eq(column, value)
      .order(orderBy, { ascending: true })
    if (error) {
      setError(error.message)
    } else {
      setError(null)
      const loadedRows = data as unknown as T[]
      idsRef.current = new Set(loadedRows.map((r) => r.id))
      setRows(loadedRows)
    }
    setLoaded(true)
  }, [table, column, value, orderBy, select])

  useEffect(() => {
    const supabase = getSupabase()
    void reload()

    // Bei jeder Änderung neu laden: einfacher und robuster als Einzel-Events
    // zusammenzuführen, und bei Freundeskreis-Größe billig.
    // Zusätzlich neu laden, sobald das Abo (wieder) steht: Änderungen zwischen
    // erstem Laden und fertigem Abo oder während eines Verbindungsabbruchs
    // kämen sonst nie an.
    // DELETE-Events lassen sich in Supabase nicht filtern, daher ein eigenes,
    // ungefiltertes Abo, das nur auf Zeilen reagiert, die wir kennen.
    const channel = supabase
      .channel(`${table}:${value}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${column}=eq.${value}` },
        () => void reload(),
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) => {
        const id = (payload.old as { id?: string }).id
        if (id && idsRef.current.has(id)) void reload()
      })
    // RLS sorgt dafür, dass hier nur Änderungen sichtbarer Zeilen ankommen.
    if (alsoWatch) {
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: alsoWatch }, () => void reload())
    }
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') void reload()
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [table, column, value, alsoWatch, reload])

  return { rows, loaded, error, reload }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Nur der anon-Key gehört ins Frontend, niemals der service-role-Key.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert (.env mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY fehlt).')
  }
  return supabase
}

// Postgres-Fehlercode für Unique-Verletzung
export const UNIQUE_VIOLATION = '23505'

// Spiegelt die Tabellen aus SPEC.md (nur die Felder, die der Client nutzt).

import type { ThemePref } from './theme'

export interface Group {
  slug: string
  name: string
  created_at: string
}

// Was andere von einer Person sehen (aus profiles)
export interface Profile {
  name: string
  emoji: string | null
  color: string | null // null = automatisch
}

// Eigenes Profil, eine Zeile pro Nutzer (id = Supabase-Auth-User-ID)
export interface OwnProfile extends Profile {
  theme: ThemePref
}

// Mitgliedschaft; name/emoji/color kommen aus dem Profil (von useMembers eingeblendet).
export interface Member extends Profile {
  id: string
  group_slug: string
  user_id: string // Supabase-Auth-User-ID
  role: 'member' | 'admin'
  created_at: string
}

export type DayStatus = 'yes' | 'maybe' | 'no'

// {"2026-12-27": "yes"}; ein fehlender Tag heißt keine Antwort
export type DayMap = Record<string, DayStatus>

export interface Availability {
  id: string
  round_id: string
  user_id: string
  days: DayMap
  updated_at: string
}

export type RoundStatus = 'open' | 'decided' | 'archived'

export interface Round {
  id: string
  group_slug: string
  title: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  excluded_dates: string[]
  headcount: number | null
  status: RoundStatus
  decided_dates: string[] | null
  created_by: string | null // User-ID des Erstellers
  created_at: string
}

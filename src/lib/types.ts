// Spiegelt die Tabellen aus SPEC.md (nur die Felder, die der Client nutzt).

export interface Group {
  slug: string
  name: string
  created_at: string
}

export interface Member {
  id: string
  group_slug: string
  client_id: string
  name: string
  emoji: string | null
  color: string | null
  created_at: string
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
  created_by: string | null
  created_at: string
}

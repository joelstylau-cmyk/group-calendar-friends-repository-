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

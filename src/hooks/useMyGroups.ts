import type { Group } from '../lib/types'
import { useLiveRows } from './useLiveRows'

interface MembershipRow {
  id: string
  group: Group | null
}

// Alle Gruppen, in denen der Nutzer Mitglied ist, live (Beitreten/Verlassen in anderem Tab).
export function useMyGroups(userId: string) {
  const { rows, ...rest } = useLiveRows<MembershipRow>('members', 'user_id', userId, {
    select: 'id, created_at, group:groups(slug, name, created_at)',
  })
  // Zuletzt beigetretene Gruppe zuerst
  const groups = rows.flatMap((r) => (r.group ? [r.group] : [])).reverse()
  return { groups, ...rest }
}

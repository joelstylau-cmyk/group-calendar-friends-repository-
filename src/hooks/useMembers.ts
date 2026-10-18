import type { Member, Profile } from '../lib/types'
import { useLiveRows } from './useLiveRows'

type MemberRow = Omit<Member, keyof Profile> & { profile: Profile | null }

// Mitglieder einer Gruppe, mit Name/Emoji/Farbe aus dem globalen Profil.
// Profiländerungen (z.B. neuer Name in den Settings) kommen live an.
export function useMembers(slug: string) {
  const { rows, ...rest } = useLiveRows<MemberRow>('members', 'group_slug', slug, {
    select: '*, profile:profiles(name, emoji, color)',
    alsoWatch: 'profiles',
  })
  const members: Member[] = rows.map(({ profile, ...m }) => ({
    ...m,
    name: profile?.name ?? 'Unbekannt',
    emoji: profile?.emoji ?? null,
    color: profile?.color ?? null,
  }))
  return { members, ...rest }
}

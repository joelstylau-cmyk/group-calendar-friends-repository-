import type { Member } from '../lib/types'
import { useLiveRows } from './useLiveRows'

export function useMembers(slug: string) {
  const { rows, ...rest } = useLiveRows<Member>('members', 'group_slug', slug)
  return { members: rows, ...rest }
}

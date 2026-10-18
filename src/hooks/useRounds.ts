import type { Round } from '../lib/types'
import { useLiveRows } from './useLiveRows'

export function useRounds(slug: string) {
  const { rows, ...rest } = useLiveRows<Round>('rounds', 'group_slug', slug)
  return { rounds: rows, ...rest }
}

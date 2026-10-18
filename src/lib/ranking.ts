import type { DayMap, DayStatus } from './types'

// Wer kann an einem Tag bzw. Block aus aufeinanderfolgenden Tagen?
// Echte Schnittmenge: "yes" nur, wer an ALLEN Tagen des Blocks yes hat.
export interface BlockResult {
  days: string[]
  yes: string[] // an allen Tagen yes
  maybe: string[] // an allen Tagen yes oder maybe, mindestens einmal maybe
  no: string[] // an mindestens einem Tag no
  none: string[] // kein no, aber an mindestens einem Tag keine Antwort
}

export function classifyBlock(days: string[], people: string[], entries: Map<string, DayMap>): BlockResult {
  const result: BlockResult = { days, yes: [], maybe: [], no: [], none: [] }
  for (const person of people) {
    const map = entries.get(person) ?? {}
    const values: (DayStatus | undefined)[] = days.map((d) => map[d])
    if (values.includes('no')) result.no.push(person)
    else if (values.includes(undefined)) result.none.push(person)
    else if (values.every((v) => v === 'yes')) result.yes.push(person)
    else result.maybe.push(person)
  }
  return result
}

// Mehr sichere Zusagen zuerst, dann mehr Vielleichts, dann weniger Absagen.
// Bei Gleichstand bleibt die zeitliche Reihenfolge (stabile Sortierung).
function compareBlocks(a: BlockResult, b: BlockResult): number {
  return b.yes.length - a.yes.length || b.maybe.length - a.maybe.length || a.no.length - b.no.length
}

// windowDays: alle Tage des Fensters in Reihenfolge, also lückenlos aufeinanderfolgend.
// Blöcke, die einen gesperrten Tag enthalten, fallen weg.
export function rankBlocks(
  windowDays: string[],
  excluded: Set<string>,
  length: number,
  people: string[],
  entries: Map<string, DayMap>,
  limit = 5,
): BlockResult[] {
  const results: BlockResult[] = []
  for (let i = 0; i + length <= windowDays.length; i++) {
    const days = windowDays.slice(i, i + length)
    if (days.some((d) => excluded.has(d))) continue
    const result = classifyBlock(days, people, entries)
    if (result.yes.length + result.maybe.length === 0) continue
    results.push(result)
  }
  return results.sort(compareBlocks).slice(0, limit)
}

import type { DayMap, DayStatus } from './types'

// Wer kann an einem Tag bzw. Block aus aufeinanderfolgenden Tagen? (für die Detail-Ansicht)
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

// Strikte Schnittmenge fürs Ranking: nur wer an ALLEN Tagen des Blocks "kann" hat.
export interface StrictBlock {
  days: string[]
  yes: string[]
}

export interface LengthResult {
  length: number
  blocks: StrictBlock[] // beste zuerst, leer = kein passender Block
}

// windowDays: alle Tage des Fensters in Reihenfolge, also lückenlos aufeinanderfolgend.
// Gesperrte Tage unterbrechen jeden Block.
export function rankByLength(
  windowDays: string[],
  excluded: Set<string>,
  minLength: number,
  maxLength: number,
  people: string[],
  entries: Map<string, DayMap>,
  perLength = 3,
): LengthResult[] {
  const n = windowDays.length
  // runs[k][i] = wie viele Tage Person k ab Tag i ununterbrochen "kann".
  // Damit kostet jeder Block nur einen Vergleich pro Person, auch bei langen Fenstern.
  const runs = people.map((person) => {
    const map = entries.get(person) ?? {}
    const run = new Array<number>(n + 1).fill(0)
    for (let i = n - 1; i >= 0; i--) {
      const day = windowDays[i]
      run[i] = !excluded.has(day) && map[day] === 'yes' ? run[i + 1] + 1 : 0
    }
    return run
  })

  const results: LengthResult[] = []
  for (let length = minLength; length <= Math.min(maxLength, n); length++) {
    const blocks: StrictBlock[] = []
    for (let i = 0; i + length <= n; i++) {
      const yes = people.filter((_, k) => runs[k][i] >= length)
      if (yes.length > 0) blocks.push({ days: windowDays.slice(i, i + length), yes })
    }
    // Mehr Leute zuerst; bei Gleichstand bleibt der frühere Termin vorn (stabile Sortierung).
    blocks.sort((a, b) => b.yes.length - a.yes.length)
    results.push({ length, blocks: blocks.slice(0, perLength) })
  }
  return results
}

// Bester Termin über alle Längen: die meisten Leute; bei Gleichstand der längere Block,
// dann der frühere.
export function bestOverall(results: LengthResult[]): StrictBlock | undefined {
  let best: StrictBlock | undefined
  for (const { blocks } of results) {
    const top = blocks[0]
    if (!top) continue
    if (!best || top.yes.length > best.yes.length || (top.yes.length === best.yes.length && top.days.length > best.days.length)) {
      best = top
    }
  }
  return best
}

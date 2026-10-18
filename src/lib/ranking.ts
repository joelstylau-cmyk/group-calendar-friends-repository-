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

export interface RangeRanking {
  blocks: StrictBlock[] // beste zuerst
  emptyLengths: number[] // Längen der Spanne, für die kein Block passt
}

// Alle zusammenhängenden Blöcke mit minLength bis maxLength Tagen, an denen mindestens
// eine Person durchgehend kann. Sortierung: mehr Personen zuerst, bei Gleichstand der
// längere Block, dann der frühere. Teilblöcke besserer Blöcke fallen weg.
// windowDays: alle Tage des Fensters in Reihenfolge, also lückenlos aufeinanderfolgend.
// Gesperrte Tage unterbrechen jeden Block.
export function rankInRange(
  windowDays: string[],
  excluded: Set<string>,
  minLength: number,
  maxLength: number,
  people: string[],
  entries: Map<string, DayMap>,
  limit = 8,
): RangeRanking {
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

  const candidates: { start: number; length: number; yes: string[] }[] = []
  const emptyLengths: number[] = []
  for (let length = minLength; length <= Math.min(maxLength, n); length++) {
    let found = false
    for (let i = 0; i + length <= n; i++) {
      const yes = people.filter((_, k) => runs[k][i] >= length)
      if (yes.length > 0) {
        candidates.push({ start: i, length, yes })
        found = true
      }
    }
    if (!found) emptyLengths.push(length)
  }

  candidates.sort((a, b) => b.yes.length - a.yes.length || b.length - a.length || a.start - b.start)

  // Teilblöcke eines weiter oben stehenden Blocks ausblenden. Wer einen Block durchgehend
  // kann, kann auch jedes Teilstück; ein Teilstück steht also nur dann tiefer, wenn es
  // genau dieselben Leute hat, und bringt keine neue Information.
  const kept: typeof candidates = []
  for (const c of candidates) {
    if (kept.length === limit) break
    const contained = kept.some((k) => c.start >= k.start && c.start + c.length <= k.start + k.length)
    if (!contained) kept.push(c)
  }

  const blocks = kept.map((c) => ({ days: windowDays.slice(c.start, c.start + c.length), yes: c.yes }))
  return { blocks, emptyLengths }
}

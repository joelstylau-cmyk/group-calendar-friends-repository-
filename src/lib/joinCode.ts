// Beitritts-Code: 8 Zeichen, zuruf- und abtippsicher (Begründung in 004_join_code.sql).
// Muss zum Alphabet in der Migration passen.
export const JOIN_CODE_ALPHABET = '34679AFHKRTXY'
export const JOIN_CODE_LENGTH = 8

// Fehlercode von join_group_by_code nach zu vielen falschen Codes (005_join_code_ratelimit.sql)
export const JOIN_CODE_RATE_LIMITED = 'PT429'

// Eingabe vereinheitlichen: Großbuchstaben, ohne Bindestriche und Leerzeichen.
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '')
}

// Anzeige in zwei Vierergruppen: "XK7R-H3FA"
export function formatJoinCode(code: string): string {
  return code.length === JOIN_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

// Fehlermeldung für offensichtlich falsche Eingaben, null wenn die Form passt.
export function checkJoinCode(code: string): string | null {
  const invalid = [...new Set(code.split('').filter((c) => !JOIN_CODE_ALPHABET.includes(c)))]
  if (invalid.length > 0) {
    return `${invalid.join(', ')} ${invalid.length === 1 ? 'kommt' : 'kommen'} in Codes nie vor. Schau nochmal genau hin.`
  }
  if (code.length !== JOIN_CODE_LENGTH) return `Der Code hat ${JOIN_CODE_LENGTH} Zeichen.`
  return null
}

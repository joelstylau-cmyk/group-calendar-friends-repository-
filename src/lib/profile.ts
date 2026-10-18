// Merkt sich pro Gerät den zuletzt benutzten Namen und das Emoji,
// damit der Beitritt zur nächsten Gruppe vorausgefüllt ist.
// Wahrheit für "bin ich Mitglied?" bleibt die members-Tabelle.

const STORAGE_KEY = 'gk.profile'

export interface Profile {
  name: string
  emoji: string | null
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Profile>
    if (typeof parsed.name !== 'string') return null
    return { name: parsed.name, emoji: typeof parsed.emoji === 'string' ? parsed.emoji : null }
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage nicht verfügbar
  }
}

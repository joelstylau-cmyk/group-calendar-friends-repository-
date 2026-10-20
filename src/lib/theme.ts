// Hell / Dunkel / Automatisch. Gespeichert im Profil (gilt auf allen Geräten),
// lokal gespiegelt, damit index.html das Theme vor dem ersten Rendern setzen kann.
export type ThemePref = 'light' | 'dark' | 'system'

export const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'Automatisch' },
]

// Muss zum Schlüssel im Inline-Skript in index.html passen.
const STORAGE_KEY = 'gk-theme'

// Lokal gespiegelte Wahl, bis das Profil geladen ist
export function storedTheme(): ThemePref {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    // kein Speicher verfügbar
  }
  return 'system'
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement
  // 'system': kein Attribut, dann greift prefers-color-scheme (siehe index.css)
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // z.B. privater Modus ohne Speicher: Theme gilt dann nur bis zum Neuladen
  }
}

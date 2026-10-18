import { nanoid } from 'nanoid'

const STORAGE_KEY = 'gk.clientId'

let cached: string | null = null

// Geräte-Identität: einmal erzeugt, danach aus localStorage gelesen.
// Ist localStorage blockiert (privates Fenster o.ä.), gilt die ID nur für diese Sitzung.
export function getClientId(): string {
  if (cached) return cached
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return (cached = stored)
  } catch {
    // localStorage nicht verfügbar
  }
  cached = nanoid()
  try {
    localStorage.setItem(STORAGE_KEY, cached)
  } catch {
    // localStorage nicht verfügbar
  }
  return cached
}

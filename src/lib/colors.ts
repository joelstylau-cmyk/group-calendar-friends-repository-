// Avatar-Farben für Mitglieder. Stabil pro clientId, damit jede Person
// auf allen Geräten dieselbe Farbe hat.
const MEMBER_COLORS = [
  '#5b6cff', // periwinkle
  '#e8590c', // orange
  '#0ca678', // teal
  '#d6336c', // pink
  '#7048e8', // violett
  '#1c7ed6', // blau
  '#f08c00', // gelb-orange
  '#2f9e44', // grün
]

export function colorForClientId(clientId: string): string {
  let hash = 0
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) | 0
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

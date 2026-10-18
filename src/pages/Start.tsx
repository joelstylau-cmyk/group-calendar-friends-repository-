import { Link } from 'react-router-dom'
import ConnectionStatus from '../components/ConnectionStatus'
import { getClientId } from '../lib/clientId'

export default function Start() {
  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Gruppenkalender</h1>
      <p>Startseite (M0-Platzhalter).</p>
      <Link to="/g/test-slug" className="text-[#5b6cff] underline">
        Zur Test-Gruppe /g/test-slug
      </Link>
      <ConnectionStatus />
      <p className="text-xs text-gray-500">clientId: {getClientId()}</p>
    </main>
  )
}

import { Link, useParams } from 'react-router-dom'
import { getClientId } from '../lib/clientId'

export default function Group() {
  const { slug } = useParams()

  return (
    <main className="mx-auto max-w-md px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Gruppe: {slug}</h1>
      <p>Gruppenansicht (M0-Platzhalter).</p>
      <Link to="/" className="text-[#5b6cff] underline">
        Zurück zur Startseite
      </Link>
      <p className="text-xs text-gray-500">clientId: {getClientId()}</p>
    </main>
  )
}

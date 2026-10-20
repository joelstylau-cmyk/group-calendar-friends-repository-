import { useState } from 'react'
import { copyText } from '../lib/clipboard'

export default function ShareButton({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleClick() {
    setState((await copyText(url)) ? 'copied' : 'failed')
    window.setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
    >
      {state === 'copied' ? '✓ Link kopiert' : state === 'failed' ? 'Kopieren fehlgeschlagen' : 'Link teilen'}
    </button>
  )
}

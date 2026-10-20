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
      className="rounded-lg border border-faint/50 px-3 py-1.5 text-sm font-medium hover:bg-paper"
    >
      {state === 'copied' ? '✓ Link kopiert' : state === 'failed' ? 'Kopieren fehlgeschlagen' : 'Link teilen'}
    </button>
  )
}

import { useState } from 'react'
import { copyText } from '../lib/clipboard'

export default function ShareButton({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleClick() {
    setState((await copyText(url)) ? 'copied' : 'failed')
    window.setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button type="button" onClick={handleClick} className="btn btn-secondary shrink-0 px-3 text-sm">
      {state === 'copied' ? '✓ Link kopiert' : state === 'failed' ? 'Kopieren fehlgeschlagen' : 'Link teilen'}
    </button>
  )
}

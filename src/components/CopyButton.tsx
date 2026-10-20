import { useState } from 'react'
import { copyText } from '../lib/clipboard'

interface Props {
  text: string | null
  label?: string
  className?: string
}

// Kopiert text in die Zwischenablage und zeigt kurz, ob es geklappt hat.
export default function CopyButton({ text, label = 'Kopieren', className = '' }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleCopy() {
    if (!text) return
    setState((await copyText(text)) ? 'copied' : 'failed')
    window.setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className={`btn bg-surface px-3 text-sm text-ink shadow-[var(--shadow-card)] ${className}`}
    >
      {state === 'copied' ? '✓ Kopiert' : state === 'failed' ? 'Fehlgeschlagen' : label}
    </button>
  )
}

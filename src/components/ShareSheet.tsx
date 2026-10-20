import { useJoinCode } from '../hooks/useJoinCode'
import { formatJoinCode } from '../lib/joinCode'
import CopyButton from './CopyButton'
import Sheet from './Sheet'

interface Props {
  groupSlug: string
  groupName: string
  url: string
  onClose: () => void
}

// Link und Beitritts-Code nebeneinander, je mit Kopieren-Knopf.
export default function ShareSheet({ groupSlug, groupName, url, onClose }: Props) {
  const { code, error } = useJoinCode(groupSlug)
  const formatted = code ? formatJoinCode(code) : null
  const shortUrl = url.replace(/^https?:\/\//, '')

  return (
    <Sheet title="Teilen" subtitle={`Lade Leute in „${groupName}“ ein.`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-2 rounded-[var(--r-md)] bg-surface-2 p-3">
          <p className="text-label">Link</p>
          <p className="truncate text-sm font-medium" title={url}>
            {shortUrl}
          </p>
          <p className="text-xs text-muted">Öffnen und beitreten.</p>
          <CopyButton text={url} className="mt-auto w-full" />
        </div>
        <div className="flex min-w-0 flex-col gap-2 rounded-[var(--r-md)] bg-surface-2 p-3">
          <p className="text-label">Code</p>
          <p className="truncate font-mono text-base font-semibold tracking-widest">{formatted ?? '…'}</p>
          <p className="text-xs text-muted">Auf der Startseite eingeben.</p>
          <CopyButton text={formatted} className="mt-auto w-full" />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-no-ink">Beitritts-Code laden fehlgeschlagen: {error}</p>}
    </Sheet>
  )
}

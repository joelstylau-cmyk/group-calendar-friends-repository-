import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
}

// Ab dieser Wischstrecke nach unten schließt das Sheet
const CLOSE_DISTANCE = 80

// Bottom-Sheet: fährt von unten hoch, schließt per Esc, Tippen daneben oder Wischen nach unten.
// Gewischt wird am Kopf (Grabber + Titel), damit der Inhalt normal scrollen kann.
export default function Sheet({ title, subtitle, onClose, children }: Props) {
  const titleId = useId()
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Knöpfe im Kopf (Schließen) sollen normal klickbar bleiben
    if ((e.target as HTMLElement).closest('button')) return
    dragStart.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }

  function handlePointerEnd() {
    if (dragStart.current === null) return
    dragStart.current = null
    setDragging(false)
    if (dragY > CLOSE_DISTANCE) onClose()
    else setDragY(0)
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet relative flex max-h-[85vh] w-full max-w-md flex-col"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 180ms ease-out',
        }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="shrink-0 cursor-grab touch-none px-5 pt-3 pb-4 select-none"
        >
          <div className="sheet-grabber" aria-hidden="true" />
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-h2">
                {title}
              </h2>
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="-mt-1 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-surface-2"
            >
              ×
            </button>
          </header>
        </div>
        <div
          className="overflow-y-auto overscroll-contain px-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

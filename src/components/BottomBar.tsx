import { useLayoutEffect, useRef, type ReactNode } from 'react'

// Abstand zwischen letztem Inhalt und Leiste
const GAP_PX = 16

interface Props {
  children: ReactNode
  // Nur auf schmalen Bildschirmen zeigen (Desktop: Aktion bleibt im Inhalt)
  mobileOnly?: boolean
}

// Feste Aktionsleiste unten im Daumenbereich. Misst ihre echte Höhe (inkl.
// Safe-Area) und reserviert so viel Platz am Seitenende (--bottom-bar-space,
// siehe body in index.css), damit nichts hinter ihr verschwindet.
export default function BottomBar({ children, mobileOnly = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    // Ausgeblendet (display: none auf dem Desktop) misst 0, dann kein Platz nötig
    const update = () => {
      const height = el.offsetHeight
      root.style.setProperty('--bottom-bar-space', height > 0 ? `${height + GAP_PX}px` : '0px')
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      root.style.removeProperty('--bottom-bar-space')
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`fixed inset-x-0 bottom-0 z-10 border-t border-line/60 bg-surface/90 px-4 pt-3 shadow-[var(--shadow-raised)] backdrop-blur-md ${
        mobileOnly ? 'md:hidden' : ''
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}

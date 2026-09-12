import { useEffect, useRef, useState } from 'react'

export type TransitionState = 'entering' | 'entered' | 'exiting'

/**
 * Keeps a conditionally-rendered element mounted for `duration` ms after
 * `active` goes false, so a CSS fade/scale-out can play instead of an
 * instant unmount (and the reverse — a mount-time "entering" tick lets the
 * enter transition start from its initial state instead of snapping in).
 */
export function useExitTransition(active: boolean, duration = 200) {
  const [mounted, setMounted] = useState(active)
  const [state, setState] = useState<TransitionState>(active ? 'entered' : 'exiting')
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (active) {
      setMounted(true)
      setState('entering')
      const raf = requestAnimationFrame(() => setState('entered'))
      return () => cancelAnimationFrame(raf)
    }
    setState('exiting')
    timer.current = window.setTimeout(() => setMounted(false), duration)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [active, duration])

  return { mounted, state }
}

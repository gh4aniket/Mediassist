import { useEffect, useRef } from 'react'

/**
 * Repeatedly runs `callback` every `delayMs`. Pass `delayMs = null` to pause.
 *
 * The ref indirection means the timer is not torn down and rebuilt every render
 * just because the callback closure changed — which matters for the 10-second
 * live-tracking poll and the driver's location stream.
 */
export default function useInterval(callback, delayMs, { immediate = false } = {}) {
  const saved = useRef(callback)

  useEffect(() => {
    saved.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs === null || delayMs === undefined) return undefined

    if (immediate) saved.current()
    const id = setInterval(() => saved.current(), delayMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs, immediate])
}

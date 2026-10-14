import { useCallback, useEffect, useRef, useState } from 'react'

const GEO_ERRORS = {
  1: 'Location permission denied. Enable it in your browser to continue.',
  2: 'Your position is unavailable right now. Check that location services are on.',
  3: 'Timed out while locating you. Try again.',
}

function describe(err) {
  return GEO_ERRORS[err?.code] || err?.message || 'Could not read your location'
}

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
}

/** Promise wrapper over the one-shot browser geolocation call. */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser does not support location access'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        }),
      (err) => reject(new Error(describe(err))),
      { ...DEFAULT_OPTIONS, ...options },
    )
  })
}

/**
 * Live position of the current device.
 *
 * `watch: true` keeps a `watchPosition` subscription open — that is what the
 * driver app uses to stream its coordinates to the booking while driving.
 */
export default function useGeolocation({ watch = false, immediate = true, options } = {}) {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(immediate)
  const watchId = useRef(null)

  const locate = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const point = await getCurrentPosition(options)
      setPosition(point)
      return point
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  useEffect(() => {
    if (immediate && !watch) locate()
    // `locate` is stable enough here; re-running on every render would spam the
    // permission prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, watch])

  useEffect(() => {
    if (!watch) return undefined
    if (!('geolocation' in navigator)) {
      setError('This browser does not support location access')
      setLoading(false)
      return undefined
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        })
        setError('')
        setLoading(false)
      },
      (err) => {
        setError(describe(err))
        setLoading(false)
      },
      { ...DEFAULT_OPTIONS, ...options },
    )

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch])

  return { position, error, loading, locate, supported: 'geolocation' in navigator }
}

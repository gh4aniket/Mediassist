import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads a resource once on mount (and whenever `deps` change), exposing the
 * `{ data, loading, error, reload, setData }` shape every page in this app needs.
 *
 * `fetcher` is called with an AbortSignal; pass it through to the API helper so
 * an unmount cancels the in-flight request instead of setting state after it.
 */
export default function useApiResource(fetcher, deps = [], { enabled = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(
    async (signal) => {
      if (!enabled) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const result = await fetcher(signal)
        if (mounted.current && !signal?.aborted) setData(result)
      } catch (err) {
        if (err.name === 'AbortError' || signal?.aborted) return
        if (mounted.current) setError(err.message || 'Something went wrong')
      } finally {
        if (mounted.current && !signal?.aborted) setLoading(false)
      }
    },
    // The fetcher is typically an inline closure; `deps` is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, ...deps],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const reload = useCallback(() => load(), [load])

  return { data, loading, error, reload, setData }
}

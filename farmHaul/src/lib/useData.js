import { useCallback, useEffect, useRef, useState } from 'react'
import { POLL_MS } from './constants'

// Loads data with an async function and tracks loading/error state.
// With { poll: true } it re-runs every POLL_MS so new offers/status show up
// without real-time sockets (as the design doc suggests).
export function useData(loader, deps, { poll = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  })

  const reload = useCallback(async () => {
    try {
      const data = await loaderRef.current()
      setState({ data, error: null, loading: false })
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }))
    }
  }, [])

  useEffect(() => {
    let timer
    let stopped = false
    const run = async () => {
      await reload()
      if (poll && !stopped) timer = setTimeout(run, POLL_MS)
    }
    run()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ...state, reload }
}

// Throws the Supabase error so useData can catch it.
export function unwrap({ data, error }) {
  if (error) throw error
  return data
}

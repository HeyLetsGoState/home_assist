import { useState, useEffect, useRef } from 'react'
import { TAUTULLI_TOKEN, TAUTULLI_POLL_INTERVAL } from '../config'

const BASE = '/api/tautulli/api/v2'

async function tautulliGet(cmd, params = '') {
  const res = await fetch(`${BASE}?apikey=${TAUTULLI_TOKEN}&cmd=${cmd}${params}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Tautulli HTTP ${res.status}`)
  const json = await res.json()
  if (json.response?.result !== 'success') throw new Error(`Tautulli: ${json.response?.message ?? 'error'}`)
  return json.response.data
}

export function useTautulli() {
  const [sessions, setSessions]   = useState([])
  const [history, setHistory]     = useState([])
  const [status, setStatus]       = useState('loading')
  const timerRef = useRef(null)

  const poll = async () => {
    try {
      const [activity, hist] = await Promise.all([
        tautulliGet('get_activity'),
        tautulliGet('get_history', '&length=5&order_column=date&order_dir=desc'),
      ])
      setSessions(activity.sessions ?? [])
      setHistory(hist.data ?? [])
      setStatus('ok')
    } catch (err) {
      console.warn('[Tautulli]', err.message)
      setStatus('error')
    }
  }

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, TAUTULLI_POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [])

  return { sessions, history, status }
}

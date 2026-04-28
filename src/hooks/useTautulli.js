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

function toDateStr(date) {
  return date.toISOString().slice(0, 10)
}

export function useTautulli() {
  const [sessions, setSessions]   = useState([])
  const [history, setHistory]     = useState([])
  const [libraries, setLibraries] = useState([])
  const [plays, setPlays]         = useState({ today: null, week: null })
  const [status, setStatus]       = useState('loading')
  const timerRef = useRef(null)

  const poll = async () => {
    try {
      const today   = toDateStr(new Date())
      const weekAgo = toDateStr(new Date(Date.now() - 6 * 86400000))

      const [activity, hist, libs, playsToday, playsWeek] = await Promise.all([
        tautulliGet('get_activity'),
        tautulliGet('get_history', '&length=5&order_column=date&order_dir=desc'),
        tautulliGet('get_libraries'),
        tautulliGet('get_history', `&length=1&start_date=${today}`),
        tautulliGet('get_history', `&length=1&start_date=${weekAgo}`),
      ])

      setSessions(activity.sessions ?? [])
      setHistory(hist.data ?? [])
      setLibraries(libs ?? [])
      setPlays({
        today: playsToday.recordsFiltered ?? 0,
        week:  playsWeek.recordsFiltered ?? 0,
      })
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

  return { sessions, history, libraries, plays, status }
}

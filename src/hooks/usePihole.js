import { useState, useEffect, useRef } from 'react'
import { PIHOLE_PASSWORD, PIHOLE_POLL_INTERVAL } from '../config'

const BASE = '/api/pihole'

// ── Pi-hole v6 auth ──────────────────────────────────────────────────────────
// v6 requires POST /api/auth → get a session ID (sid), valid for 30 min.
// We cache the sid and re-auth when it expires or we get a 401.

let cachedSid = null
let sidExpiry = 0 // epoch ms

async function getSid() {
  if (cachedSid && Date.now() < sidExpiry) return cachedSid

  const res = await fetch(`${BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PIHOLE_PASSWORD }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Pi-hole auth failed: ${res.status}`)
  const data = await res.json()
  cachedSid = data.session?.sid ?? null
  // validity is in seconds, default 1800; subtract 60s buffer
  const validity = (data.session?.validity ?? 1800) - 60
  sidExpiry = Date.now() + validity * 1000
  return cachedSid
}

// ── Stats fetch ──────────────────────────────────────────────────────────────
function normalizeV6(data) {
  return {
    dns_queries_today: data.queries?.total ?? 0,
    ads_blocked_today: data.queries?.blocked ?? 0,
    ads_percentage_today: data.queries?.percent_blocked ?? 0,
    domains_being_blocked: data.gravity?.domains_being_blocked ?? 0,
    clients_ever_seen: data.clients?.total ?? 0,
    unique_domains: data.queries?.unique_domains ?? 0,
  }
}

async function fetchV6Stats() {
  const sid = await getSid()
  const headers = sid ? { 'X-FTL-SID': sid } : {}
  const res = await fetch(`${BASE}/api/stats/summary`, {
    headers,
    cache: 'no-store',
  })
  if (res.status === 401) {
    // Force re-auth on next attempt
    cachedSid = null
    sidExpiry = 0
    throw new Error('Pi-hole session expired')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return normalizeV6(await res.json())
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function usePihole() {
  const [stats, setStats] = useState(null)
  const [status, setStatus] = useState('loading')
  const timerRef = useRef(null)

  const fetchStats = async () => {
    try {
      const data = await fetchV6Stats()
      setStats(data)
      setStatus('ok')
    } catch (err) {
      console.warn('Pi-hole fetch error:', err.message)
      setStatus('error')
    }
  }

  useEffect(() => {
    fetchStats()
    timerRef.current = setInterval(fetchStats, PIHOLE_POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [])

  return { stats, status, refetch: fetchStats }
}

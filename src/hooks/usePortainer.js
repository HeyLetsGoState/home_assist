import { useState, useEffect, useRef } from 'react'
import { PORTAINER_TOKEN, PORTAINER_POLL_INTERVAL } from '../config'

const BASE = '/api/portainer'
const HEADERS = { 'X-API-Key': PORTAINER_TOKEN }

function parseHealth(state, status) {
  if (state !== 'running') return state // exited, paused, etc.
  if (status?.includes('(healthy)'))   return 'healthy'
  if (status?.includes('(unhealthy)')) return 'unhealthy'
  if (status?.includes('(starting)'))  return 'starting'
  return 'running'
}

let cachedEndpointId = null

async function getEndpointId() {
  if (cachedEndpointId) return cachedEndpointId
  const res = await fetch(`${BASE}/api/endpoints`, { headers: HEADERS, cache: 'no-store' })
  if (!res.ok) throw new Error(`Portainer endpoints HTTP ${res.status}`)
  const endpoints = await res.json()
  // Prefer the local Docker socket endpoint
  const local = endpoints.find(e => e.URL?.includes('docker.sock')) ?? endpoints[0]
  if (!local) throw new Error('No Portainer endpoints found')
  cachedEndpointId = local.Id
  return cachedEndpointId
}

function calcStats(s) {
  if (!s?.cpu_stats || !s?.precpu_stats) return { cpu: null, mem: null }
  const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage
  const sysDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage
  const numCpus  = s.cpu_stats.online_cpus ?? s.cpu_stats.cpu_usage.percpu_usage?.length ?? 1
  const cpu = sysDelta > 0 ? Math.min((cpuDelta / sysDelta) * numCpus * 100, 100) : 0
  const mem = s.memory_stats?.limit > 0
    ? Math.min((s.memory_stats.usage / s.memory_stats.limit) * 100, 100)
    : null
  return { cpu, mem }
}

async function fetchContainers() {
  const id = await getEndpointId()
  const res = await fetch(`${BASE}/api/endpoints/${id}/docker/containers/json?all=true`, {
    headers: HEADERS,
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Portainer HTTP ${res.status}`)
  const raw = await res.json()

  const containers = raw.map(c => ({
    id:     c.Id.slice(0, 12),
    fullId: c.Id,
    name:   (c.Names?.[0] ?? '/unknown').replace(/^\//, ''),
    state:  c.State,
    health: parseHealth(c.State, c.Status),
    url:    `http://portainer.home:9000/#!/${id}/docker/containers/${c.Id}`,
    cpu:    null,
    mem:    null,
  }))

  // Fetch live stats for running containers in parallel
  const running = containers.filter(c => c.state === 'running')
  const results = await Promise.allSettled(
    running.map(c =>
      fetch(`${BASE}/api/endpoints/${id}/docker/containers/${c.fullId}/stats?stream=false`, {
        headers: HEADERS, cache: 'no-store',
      }).then(r => r.ok ? r.json() : null)
    )
  )

  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      const { cpu, mem } = calcStats(r.value)
      const idx = containers.findIndex(c => c.fullId === running[i].fullId)
      if (idx >= 0) { containers[idx].cpu = cpu; containers[idx].mem = mem }
    }
  })

  return containers
}

export function usePortainer() {
  const [containers, setContainers] = useState([])
  const [status, setStatus]         = useState('loading')
  const timerRef = useRef(null)

  const poll = async () => {
    try {
      const data = await fetchContainers()
      setContainers(data)
      setStatus('ok')
    } catch (err) {
      console.warn('[Portainer]', err.message)
      setStatus('error')
    }
  }

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, PORTAINER_POLL_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [])

  const running = containers.filter(c => c.state === 'running').length

  return { containers, running, total: containers.length, status }
}

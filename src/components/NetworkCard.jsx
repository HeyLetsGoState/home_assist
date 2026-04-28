import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { TermFrame, TermSparkline, T } from './TermFrame'
import { SPARKLINE_HISTORY } from '../config'

function uptimeSince(isoString) {
  if (!isoString) return '—'
  try { return formatDistanceToNow(new Date(isoString), { addSuffix: false }) } catch { return '—' }
}

const HEALTH_COLOR = {
  healthy:   '#7fd9c8', // cyan
  running:   '#7fd9c8',
  unhealthy: '#ff6b6b', // red
  starting:  '#ffb454', // amber
  exited:    '#555e6e', // dim
  paused:    '#555e6e',
  dead:      '#ff6b6b',
}

function ContainerRow({ name, health, url, cpu, mem }) {
  const color = HEALTH_COLOR[health] ?? '#555e6e'
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', cursor: 'pointer' }}>
      <span style={{ color, fontSize: 8, lineHeight: 1, flexShrink: 0 }}>●</span>
      <span style={{ color: '#a0b0c0', fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <span style={{ color: color, fontSize: 9, flexShrink: 0, opacity: 0.8 }}>{health.toUpperCase()}</span>
      {cpu != null && (
        <span style={{ color: T.dim, fontSize: 9, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: cpu > 50 ? T.amber : T.dim }}>{cpu.toFixed(1)}%</span>
          {mem != null && <span style={{ opacity: 0.6 }}> · {mem.toFixed(0)}%</span>}
        </span>
      )}
    </a>
  )
}

export function NetworkCard({ states, entities, portainer = { containers: [], running: 0, total: 0, status: 'loading' } }) {
  const cpu    = states[entities.cpu]
  const memory = states[entities.memory]
  const stateEnt = states[entities.state]
  const uptime   = states[entities.uptime]

  const cpuVal = cpu    ? parseFloat(cpu.state)    : 0
  const memVal = memory ? parseFloat(memory.state) : 0
  const isOnline  = stateEnt?.state === 'connected'
  const uptimeStr = uptimeSince(uptime?.state)

  const [cpuHistory, setCpuHistory] = useState(() => Array(SPARKLINE_HISTORY).fill(0))
  const [memHistory, setMemHistory] = useState(() => Array(SPARKLINE_HISTORY).fill(0))

  useEffect(() => {
    if (!isNaN(cpuVal)) setCpuHistory((h) => [...h.slice(1), cpuVal])
  }, [cpu?.state]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isNaN(memVal)) setMemHistory((h) => [...h.slice(1), memVal])
  }, [memory?.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const statLabel = { ...T.label, marginBottom: 4 }

  return (
    <TermFrame title="ROUTER · UNIFI DREAM MACHINE" accent={T.cyan} right={`UP ${uptimeStr.toUpperCase()}`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={statLabel}>CPU</div>
          <div style={{ fontSize: 22, color: T.amber, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {cpu ? `${cpuVal.toFixed(1)}%` : '—'}
          </div>
          <TermSparkline data={cpuHistory} color={T.amber} h={28} />
        </div>
        <div>
          <div style={statLabel}>MEM</div>
          <div style={{ fontSize: 22, color: T.green, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {memory ? `${memVal.toFixed(1)}%` : '—'}
          </div>
          <TermSparkline data={memHistory} color={T.green} h={28} />
        </div>
      </div>

      <div style={{
        marginTop: 10, paddingTop: 8, borderTop: `1px dotted ${T.border}`,
        fontSize: 10, color: T.dim, display: 'flex', justifyContent: 'space-between',
      }}>
        <span>STATUS: <span style={{ color: isOnline ? T.green : T.red }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span></span>
        <span>UP: <span style={{ color: T.cyan }}>{uptimeStr}</span></span>
      </div>

      {/* ── Portainer containers ── */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dotted ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ ...T.label }}>CONTAINERS</span>
          {portainer.status === 'ok'
            ? <span style={{ fontSize: 10, color: T.dim }}>
                <span style={{ color: T.green }}>{portainer.running}</span>
                <span style={{ color: T.dim }}> / {portainer.total} running</span>
              </span>
            : <span style={{ fontSize: 9, color: T.dim }}>{portainer.status === 'loading' ? '...' : 'UNREACHABLE'}</span>
          }
        </div>
        {portainer.status === 'ok' && portainer.containers.map(c => (
          <ContainerRow key={c.id} name={c.name} health={c.health} url={c.url} cpu={c.cpu} mem={c.mem} />
        ))}
      </div>
    </TermFrame>
  )
}

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { TermFrame, TermSparkline, T } from './TermFrame'
import { SPARKLINE_HISTORY } from '../config'

function uptimeSince(isoString) {
  if (!isoString) return '—'
  try { return formatDistanceToNow(new Date(isoString), { addSuffix: false }) } catch { return '—' }
}

export function NetworkCard({ states, entities }) {
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
    </TermFrame>
  )
}

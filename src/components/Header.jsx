import { useState, useEffect } from 'react'
import { T } from './TermFrame'

const WS_COLOR = {
  connected:    T.green,
  connecting:   T.amber,
  disconnected: T.dim,
  error:        T.red,
}

export function Header({ connectionStatus }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const ts = time.toISOString().replace('T', ' ').slice(0, 19)
  const wsColor = WS_COLOR[connectionStatus] ?? T.dim
  const wsLabel = connectionStatus.toUpperCase()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '7px 12px', border: `1px solid ${T.border}`,
      marginBottom: 14, background: T.bg2,
      fontFamily: 'inherit', minWidth: 0,
    }}>
      <span style={{ color: T.amber, fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0 }}>HOME//OS</span>
      <span style={{ color: T.dim, flexShrink: 0 }}>v2.1.4-alpha</span>
      <span style={{ flex: 1, color: T.dim, overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0 }}>{'·'.repeat(200)}</span>
      <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', flexShrink: 0, fontSize: 11 }}>
        [{ts} UTC]
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: wsColor, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 11 }}>
        <span style={{
          width: 7, height: 7, background: wsColor, borderRadius: '50%',
          boxShadow: `0 0 8px ${wsColor}`, display: 'inline-block',
          animation: connectionStatus === 'connected' ? 'term-blink 1.4s infinite' : 'none',
        }} />
        WS:{wsLabel}
      </span>
    </div>
  )
}

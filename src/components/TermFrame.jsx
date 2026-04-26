export const T = {
  cyan:   '#7fd9c8',
  amber:  '#ffb454',
  dim:    '#3a5a55',
  red:    '#ff6b6b',
  green:  '#6ee7a7',
  bg2:    '#080b0e',
  border: '#1a2428',
}

export function TermFrame({ title, accent = T.cyan, children, right, style }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, background: T.bg2, padding: 12, position: 'relative', minWidth: 0, overflow: 'hidden', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 10, letterSpacing: '0.08em', color: accent, textTransform: 'uppercase',
          flex: 1, overflow: 'hidden', minWidth: 0,
        }}>
          <span style={{ color: T.dim, flexShrink: 0 }}>┌─</span>
          <span style={{ flexShrink: 0 }}>{title}</span>
          <span style={{ color: T.dim, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>{'─'.repeat(200)}</span>
        </div>
        {right && (
          <div style={{ fontSize: 10, color: T.dim, flexShrink: 0, marginLeft: 12 }}>{right}</div>
        )}
      </div>
      {children}
    </div>
  )
}

export function TermSparkline({ data, color, h = 28 }) {
  if (!data || data.length < 2) return null
  const w = 200
  const max = Math.max(...data, 1)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', height: h }}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} fillOpacity="0.12" stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}

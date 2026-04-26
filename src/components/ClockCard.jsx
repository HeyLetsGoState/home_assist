import { useClock } from '../hooks/useClock'
import { sunTime } from '../utils/time'
import { TermFrame, T } from './TermFrame'

export function ClockCard({ sunState }) {
  const time = useClock()

  const hhmm = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const ss = String(time.getSeconds()).padStart(2, '0')
  const dateStr = time
    .toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase()
  const dayOfYear = Math.floor((time - new Date(time.getFullYear(), 0, 0)) / 86_400_000)
  const epoch = Math.floor(time.getTime() / 1000)

  const sunrise = sunTime(sunState?.attributes?.next_rising) ?? '—'
  const sunset  = sunTime(sunState?.attributes?.next_setting) ?? '—'

  return (
    <TermFrame title="SYSCLOCK" accent={T.amber}>
      <div style={{
        fontSize: 80, color: T.amber, fontWeight: 600, letterSpacing: '0.04em',
        lineHeight: 1, fontVariantNumeric: 'tabular-nums',
        textShadow: `0 0 14px ${T.amber}66`,
      }}>
        {hhmm}
        <span style={{ fontSize: 32, color: `${T.amber}88`, marginLeft: 4 }}>:{ss}</span>
        <span style={{ animation: 'term-blink 1s infinite' }}>_</span>
      </div>

      <div style={{ marginTop: 10, color: T.cyan, fontSize: 12, letterSpacing: '0.06em' }}>
        {dateStr}
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: T.dim, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', lineHeight: 1.9 }}>
        <span>SUNRISE: {sunrise}</span>
        <span>SUNSET: {sunset}</span>
        <span>DAY: {dayOfYear}/365</span>
        <span>EPOCH: {epoch}</span>
      </div>
    </TermFrame>
  )
}

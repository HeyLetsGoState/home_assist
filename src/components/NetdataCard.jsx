import { TermFrame, TermSparkline, T } from './TermFrame'

function fmt(val, decimals = 1) {
  return val != null ? val.toFixed(decimals) : '—'
}

function fmtBytes(kbits) {
  if (kbits == null) return '—'
  if (kbits >= 1_000_000) return `${(kbits / 1_000_000).toFixed(1)} Gb/s`
  if (kbits >= 1_000) return `${(kbits / 1_000).toFixed(1)} Mb/s`
  return `${kbits.toFixed(0)} kb/s`
}

function fmtGiB(gib) {
  if (gib == null) return '—'
  if (gib >= 1024) return `${(gib / 1024).toFixed(1)} TB`
  return `${gib.toFixed(0)} GB`
}

function tempColor(c) {
  if (c >= 80) return T.red
  if (c >= 65) return T.amber
  return T.green
}

const lbl = { fontSize: 10, color: T.dim, letterSpacing: '0.06em', marginBottom: 3 }
const val = { fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }

function DiskBar({ pct }) {
  if (pct == null) return null
  const color = pct > 90 ? T.red : pct > 75 ? T.amber : T.green
  return (
    <div style={{ height: 4, background: T.border, borderRadius: 2, marginTop: 5 }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

export function NetdataCard({ cpu, ram, net, disk, load, temps, status }) {
  const ok = status === 'ok'

  return (
    <TermFrame
      title="NAS · HOME SERVER"
      accent={T.green}
      right={status === 'error' ? 'OFFLINE' : status === 'loading' ? 'CONNECTING…' : 'LIVE'}
    >
      {/* CPU + RAM */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={lbl}>CPU</div>
          <div style={{ ...val, fontSize: 22, color: T.amber }}>
            {ok && cpu ? `${fmt(cpu.current)}%` : '—'}
          </div>
          <TermSparkline data={cpu?.series ?? []} color={T.amber} h={28} />
        </div>
        <div>
          <div style={lbl}>RAM</div>
          <div style={{ ...val, fontSize: 22, color: T.green }}>
            {ok && ram ? `${fmt(ram.pct)}%` : '—'}
          </div>
          <TermSparkline data={ram?.series ?? []} color={T.green} h={28} />
        </div>
      </div>

      {/* Load average */}
      <div style={{ borderTop: `1px dotted ${T.border}`, paddingTop: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={lbl}>LOAD AVG</div>
          {ok && load?.load1 != null && (
            <div style={{ fontSize: 9, color: T.dim }}>
              <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums' }}>{fmt(load.load1, 2)}</span>
              {' · '}
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(load.load5, 2)}</span>
              {' · '}
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(load.load15, 2)}</span>
              <span style={{ marginLeft: 4 }}>1m · 5m · 15m</span>
            </div>
          )}
        </div>
        <TermSparkline data={load?.series ?? []} color={T.cyan} h={18} />
      </div>

      {/* Network */}
      <div style={{ borderTop: `1px dotted ${T.border}`, paddingTop: 8, marginBottom: 10 }}>
        <div style={lbl}>NETWORK</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>↓ RX</div>
            <div style={{ ...val, fontSize: 13, color: T.cyan }}>
              {ok && net ? fmtBytes(net.rx) : '—'}
            </div>
            <TermSparkline data={net?.rxSeries ?? []} color={T.cyan} h={20} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: T.dim, marginBottom: 2 }}>↑ TX</div>
            <div style={{ ...val, fontSize: 13, color: T.amber }}>
              {ok && net ? fmtBytes(net.tx) : '—'}
            </div>
            <TermSparkline data={net?.txSeries ?? []} color={T.amber} h={20} />
          </div>
        </div>
      </div>

      {/* Disk */}
      <div style={{ borderTop: `1px dotted ${T.border}`, paddingTop: 8, marginBottom: ok && temps?.length ? 10 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={lbl}>DISK</div>
          {ok && disk?.totalGiB > 0 && (
            <div style={{ fontSize: 9, color: T.dim, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: disk.pct > 90 ? T.red : disk.pct > 75 ? T.amber : T.cyan }}>
                {fmtGiB(disk.usedGiB)}
              </span>
              {' / '}{fmtGiB(disk.totalGiB)}
            </div>
          )}
        </div>
        {ok && disk ? (
          <>
            <div style={{ ...val, fontSize: 18, color: disk.pct > 90 ? T.red : disk.pct > 75 ? T.amber : T.cyan }}>
              {fmt(disk.pct)}%
            </div>
            <DiskBar pct={disk.pct} />
          </>
        ) : (
          <div style={{ ...val, fontSize: 18, color: T.dim }}>—</div>
        )}
      </div>

      {/* Temperatures */}
      {ok && temps?.length > 0 && (
        <div style={{ borderTop: `1px dotted ${T.border}`, paddingTop: 8 }}>
          <div style={{ ...lbl, marginBottom: 6 }}>TEMPS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
            {temps.map(({ label, temp }) => (
              <div key={label} style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: T.dim, textTransform: 'uppercase', fontSize: 9 }}>{label} </span>
                <span style={{ color: tempColor(temp), fontWeight: 600 }}>{temp.toFixed(0)}°C</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </TermFrame>
  )
}

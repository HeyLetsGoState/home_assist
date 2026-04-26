import { useState, useEffect } from 'react'
import { TermFrame, TermSparkline, T } from './TermFrame'
import { SPARKLINE_HISTORY } from '../config'

export function PiholeCard({ stats, status }) {
  const [spark, setSpark] = useState(() => Array(SPARKLINE_HISTORY).fill(0))

  const blocked = stats ? Number(stats.ads_blocked_today) : null

  useEffect(() => {
    if (blocked != null) setSpark((h) => [...h.slice(1), blocked])
  }, [blocked])

  const isError   = status === 'error'
  const isLoading = status === 'loading'

  const queriesBlocked = stats ? Number(stats.ads_blocked_today).toLocaleString() : '—'
  const queriesTotal   = stats ? Number(stats.dns_queries_today).toLocaleString()  : '—'
  const pctBlocked     = stats ? parseFloat(stats.ads_percentage_today) : 0
  const domainsOnList  = stats ? Number(stats.domains_being_blocked) : 0
  const clients        = stats ? stats.clients_ever_seen : '—'
  const unique         = stats ? Number(stats.unique_domains) : 0

  const statusColor = isError ? T.red : T.green
  const statusRight = isError ? 'UNREACHABLE' : isLoading ? 'LOADING…' : 'SHIELDS UP'

  const subLabel = T.label

  return (
    <TermFrame title="DNS.PIHOLE" accent={statusColor} right={statusRight}>
      {isError ? (
        <div style={{ color: T.dim, fontSize: 11, padding: '8px 0' }}>
          $ could not reach pihole — check proxy/CORS config
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={subLabel}>BLOCKED/24H</div>
              <div style={{ fontSize: 26, color: T.green, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {isLoading ? '…' : queriesBlocked}
              </div>
              <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                OF {isLoading ? '…' : queriesTotal} ({isLoading ? '…' : `${pctBlocked.toFixed(1)}%`})
              </div>
            </div>

            <div style={{ flex: 1.4 }}>
              <TermSparkline data={spark} color={T.green} h={42} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.dim, marginTop: 2 }}>
                <span>T-{SPARKLINE_HISTORY}m</span>
                <span>NOW</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            marginTop: 10, paddingTop: 8, borderTop: `1px dotted ${T.border}`, fontSize: 10,
          }}>
            <div>
              <span style={subLabel}>BLOCKLIST</span><br />
              <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums' }}>
                {isLoading ? '…' : `${(domainsOnList / 1e6).toFixed(2)}M`}
              </span>
            </div>
            <div>
              <span style={subLabel}>CLIENTS</span><br />
              <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums' }}>
                {isLoading ? '…' : clients}
              </span>
            </div>
            <div>
              <span style={subLabel}>UNIQUE</span><br />
              <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums' }}>
                {isLoading ? '…' : `${(unique / 1000).toFixed(1)}K`}
              </span>
            </div>
          </div>
        </>
      )}
    </TermFrame>
  )
}

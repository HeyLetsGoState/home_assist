import { TermFrame, T } from './TermFrame'

const PLEX_SENSOR = 'sensor.thebigblackbox'

export function PlexCard({ states }) {
  const sensor = states[PLEX_SENSOR]
  const isOnline = sensor && sensor.state !== 'unavailable'

  const sessions = Object.values(states).filter(
    (s) => s.entity_id?.startsWith('media_player.plex') && (s.state === 'playing' || s.state === 'paused')
  )

  const streamCount = sessions.length
  const statusRight = !isOnline ? 'OFFLINE' : `${streamCount} STREAM(S)`

  return (
    <TermFrame title="MEDIA.PLEX" accent={T.amber} right={statusRight}>
      {sessions.length === 0 ? (
        <div style={{ color: T.dim, fontSize: 11, padding: '8px 0' }}>
          {!isOnline ? '$ server unreachable' : '$ no active sessions'}
        </div>
      ) : (
        sessions.map((s, i) => {
          const title    = s.attributes?.media_title ?? s.attributes?.friendly_name ?? s.entity_id
          const show     = s.attributes?.media_series_title ?? ''
          const user     = s.attributes?.username ?? ''
          const device   = s.attributes?.friendly_name ?? ''
          const isPlaying = s.state === 'playing'
          const pos      = s.attributes?.media_position
          const dur      = s.attributes?.media_duration
          const progress = pos && dur ? Math.min(pos / dur, 1) : 0

          return (
            <div key={s.entity_id} style={{ padding: '6px 0', borderBottom: i < sessions.length - 1 ? `1px dotted ${T.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                <span style={{ color: T.amber, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>▶ {title}</span>
                <span style={{ color: T.dim, flexShrink: 0, marginLeft: 8 }}>{show}</span>
              </div>
              <div style={{ fontSize: 10, color: T.dim, marginBottom: 4, letterSpacing: '0.06em' }}>
                USER:{user.toUpperCase()} → {device.toUpperCase()}
              </div>
              <div style={{ height: 2, background: T.border, position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${progress * 100}%`,
                  background: isPlaying ? T.amber : T.dim,
                  boxShadow: isPlaying ? `0 0 6px ${T.amber}` : 'none',
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>
          )
        })
      )}
    </TermFrame>
  )
}

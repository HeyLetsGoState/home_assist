import { formatDistanceToNow } from 'date-fns'
import { TermFrame, T } from './TermFrame'

const TRANSCODE_COLOR = { 'direct play': T.green, 'copy': T.cyan, 'transcode': T.amber }
const TRANSCODE_LABEL = { 'direct play': 'DIRECT', 'copy': 'COPY', 'transcode': 'TRANSCODE' }
const MEDIA_ICON = { movie: '▶', episode: '▶', track: '♪' }

function fmtRes(r) {
  if (!r) return ''
  return /^\d+$/.test(r) ? `${r}P` : r.toUpperCase()
}

function SessionRow({ s, isLast }) {
  const title     = s.grandparent_title ? `${s.grandparent_title} · ${s.title}` : s.full_title ?? s.title
  const progress  = parseInt(s.progress_percent ?? 0, 10)
  const decision  = (s.transcode_decision ?? 'direct play').toLowerCase()
  const tcColor   = TRANSCODE_COLOR[decision] ?? T.dim
  const tcLabel   = TRANSCODE_LABEL[decision] ?? decision.toUpperCase()
  const srcRes    = fmtRes(s.video_full_resolution || s.video_resolution)
  const streamRes = fmtRes(s.stream_video_full_resolution || s.stream_video_resolution)
  const resLabel  = srcRes && streamRes && srcRes !== streamRes
    ? `${srcRes} → ${streamRes}`
    : (streamRes || srcRes)
  const bandwidth = s.bandwidth ? `${(s.bandwidth / 1000).toFixed(1)} Mbps` : ''
  const isPlaying = s.state === 'playing'
  const icon      = MEDIA_ICON[s.media_type] ?? '▶'

  return (
    <div style={{ padding: '6px 0', borderBottom: isLast ? 'none' : `1px dotted ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: T.amber, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
          {icon} {title}
        </span>
        <span style={{ color: isPlaying ? T.green : T.dim, flexShrink: 0, marginLeft: 8, fontSize: 9 }}>
          {isPlaying ? 'PLAYING' : s.state?.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 10, color: T.dim, marginBottom: 3, letterSpacing: '0.05em' }}>
        USER:{(s.user ?? '').toUpperCase()} → {(s.player ?? s.platform ?? '').toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 9, marginBottom: 4 }}>
        {resLabel  && <span style={{ color: T.dim }}>{resLabel}</span>}
        <span style={{ color: tcColor }}>{tcLabel}</span>
        {bandwidth && <span style={{ color: T.dim }}>{bandwidth}</span>}
      </div>
      <div style={{ height: 2, background: T.border, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${progress}%`,
          background: isPlaying ? T.amber : T.dim,
          boxShadow: isPlaying ? `0 0 6px ${T.amber}` : 'none',
          transition: 'width 1s linear',
        }} />
      </div>
    </div>
  )
}

function HistoryRow({ item }) {
  const title = item.grandparent_title ? `${item.grandparent_title} · ${item.title}` : item.full_title ?? item.title
  const when  = item.stopped ? formatDistanceToNow(new Date(item.stopped * 1000), { addSuffix: true }) : ''
  const icon  = MEDIA_ICON[item.media_type] ?? '▶'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '3px 0', fontSize: 10 }}>
      <span style={{ color: T.dim, flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#a0b0c0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ color: T.dim, flexShrink: 0, fontSize: 9 }}>{(item.user ?? '').toUpperCase()}</span>
      <span style={{ color: T.dim, flexShrink: 0, fontSize: 9, opacity: 0.7 }}>{when}</span>
    </div>
  )
}

function IdleState({ history, libraries, plays }) {
  const movies = libraries.find(l => l.section_type === 'movie')
  const shows  = libraries.find(l => l.section_type === 'show')

  return (
    <div>
      {/* Library + play stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ ...T.label, marginBottom: 4 }}>LIBRARY</div>
          {movies && (
            <div style={{ fontSize: 10, color: '#a0b0c0' }}>
              <span style={{ color: T.amber, fontVariantNumeric: 'tabular-nums' }}>{movies.count.toLocaleString()}</span>
              <span style={{ color: T.dim }}> movies</span>
            </div>
          )}
          {shows && (
            <div style={{ fontSize: 10, color: '#a0b0c0' }}>
              <span style={{ color: T.amber, fontVariantNumeric: 'tabular-nums' }}>{shows.count.toLocaleString()}</span>
              <span style={{ color: T.dim }}> series · </span>
              <span style={{ color: T.amber, fontVariantNumeric: 'tabular-nums' }}>{(shows.child_count ?? 0).toLocaleString()}</span>
              <span style={{ color: T.dim }}> ep</span>
            </div>
          )}
        </div>
        <div>
          <div style={{ ...T.label, marginBottom: 4 }}>PLAYS</div>
          <div style={{ fontSize: 10 }}>
            <span style={{ color: T.dim }}>TODAY </span>
            <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums' }}>{plays.today ?? '—'}</span>
          </div>
          <div style={{ fontSize: 10 }}>
            <span style={{ color: T.dim }}>WEEK  </span>
            <span style={{ color: T.cyan, fontVariantNumeric: 'tabular-nums' }}>{plays.week ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* Recent history */}
      <div style={{ borderTop: `1px dotted ${T.border}`, paddingTop: 8 }}>
        <div style={{ ...T.label, marginBottom: 6 }}>RECENT</div>
        {history.length === 0
          ? <div style={{ color: T.dim, fontSize: 10 }}>no recent history</div>
          : history.map((item, i) => <HistoryRow key={i} item={item} />)
        }
      </div>
    </div>
  )
}

export function PlexCard({ tautulli = { sessions: [], history: [], libraries: [], plays: { today: null, week: null }, status: 'loading' } }) {
  const { sessions, history, libraries, plays, status } = tautulli
  const streamCount = sessions.length
  const right = status === 'ok'
    ? (streamCount > 0 ? `${streamCount} STREAM${streamCount > 1 ? 'S' : ''}` : 'IDLE')
    : status === 'loading' ? '...' : 'OFFLINE'

  return (
    <TermFrame title="MEDIA.PLEX" accent={T.amber} right={right}>
      {status === 'error' ? (
        <div style={{ color: T.dim, fontSize: 11, padding: '8px 0' }}>$ could not reach tautulli</div>
      ) : status === 'loading' ? (
        <div style={{ color: T.dim, fontSize: 11, padding: '8px 0' }}>$ connecting...</div>
      ) : streamCount > 0 ? (
        sessions.map((s, i) => <SessionRow key={s.session_id ?? i} s={s} isLast={i === sessions.length - 1} />)
      ) : (
        <IdleState history={history} libraries={libraries} plays={plays} />
      )}
    </TermFrame>
  )
}

import { useState, useCallback, useRef, useEffect } from 'react'
import Hls from 'hls.js'
import { useWebRTCCamera } from '../hooks/useWebRTCCamera'
import { HA_URL } from '../config'
import { TermFrame, T } from './TermFrame'

function shortAgo(isoString) {
  if (!isoString) return null
  try {
    const ms = Date.now() - new Date(isoString).getTime()
    const mins = Math.floor(ms / 60_000)
    if (mins < 1) return '<1m'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  } catch { return null }
}

function isRecent(isoString, thresholdSeconds = 60) {
  if (!isoString) return false
  try { return (Date.now() - new Date(isoString).getTime()) < thresholdSeconds * 1000 } catch { return false }
}

function snapshotUrl(cameraState, bust) {
  const token = cameraState?.attributes?.access_token
  if (!token) return null
  return `${HA_URL}/api/camera_proxy/${cameraState.entity_id}?token=${token}&_=${bust}`
}

function CameraModal({ name, mediaStream, hlsUrl, videoUrl, imgUrl, onClose, onRefresh, refreshing }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [streamError, setStreamError] = useState(null)

  // WebRTC: attach MediaStream via srcObject
  useEffect(() => {
    const video = videoRef.current
    if (!video || !mediaStream) return
    video.srcObject = mediaStream
    video.play().catch(() => {})
    return () => { video.srcObject = null }
  }, [mediaStream])

  // HLS fallback
  useEffect(() => {
    const video = videoRef.current
    if (!video || !hlsUrl || mediaStream) return

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false })
      hlsRef.current = hls
      hls.loadSource(hlsUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setStreamError('Stream unavailable')
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      video.play().catch(() => {})
    } else {
      setStreamError('HLS not supported in this browser')
    }

    return () => { hlsRef.current?.destroy(); hlsRef.current = null }
  }, [hlsUrl, mediaStream])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const showLive = (mediaStream || hlsUrl) && !streamError
  const showClip = !showLive && videoUrl
  const label = mediaStream ? 'LIVE·WebRTC' : showLive ? 'LIVE·HLS' : showClip ? 'LAST CLIP' : 'SNAPSHOT'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)', padding: 16,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 900,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          border: `1px solid ${T.border}`, background: T.bg2,
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ color: T.amber, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ┌─ {name} · {label}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!showLive && onRefresh && (
              <button onClick={onRefresh} disabled={refreshing}
                style={{ color: refreshing ? T.dim : T.cyan, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.06em' }}>
                [REFRESH]
              </button>
            )}
            <button onClick={onClose}
              style={{ color: T.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.06em' }}>
              [CLOSE]
            </button>
          </div>
        </div>

        {showLive ? (
          <video ref={videoRef} poster={imgUrl}
            style={{ flex: 1, width: '100%', objectFit: 'contain', background: '#000', minHeight: 0 }}
            controls playsInline muted />
        ) : showClip ? (
          <video src={videoUrl} poster={imgUrl}
            style={{ flex: 1, width: '100%', objectFit: 'contain', background: '#000', minHeight: 0 }}
            controls autoPlay playsInline />
        ) : imgUrl ? (
          <img src={imgUrl} alt={name}
            style={{ flex: 1, width: '100%', objectFit: 'contain', background: '#000', minHeight: 0 }} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim, fontSize: 11, minHeight: 200 }}>
            NO IMAGE
          </div>
        )}
      </div>
    </div>
  )
}

function BatteryIndicator({ pct }) {
  if (pct == null) return null
  const color = pct <= 20 ? T.red : pct <= 40 ? T.amber : T.dim
  return (
    <span style={{ color, fontSize: 9, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
      {pct <= 20 ? '⚠ ' : ''}{pct}%
    </span>
  )
}

function CamTile({ entity, state, cameraState, batteryState, getStreamUrl, callWs, sendRaw, subscribeMessage }) {
  const [bust, setBust] = useState(Date.now())
  const [modalOpen, setModalOpen] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const [hlsUrl, setHlsUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const webrtc = useWebRTCCamera({ subscribeMessage, sendRaw })

  const rawTime = entity.timeFrom === 'state' ? state?.state : state?.last_changed
  const neverFired = !rawTime || state?.state === 'unknown' || state?.state === 'unavailable'
  const lastChanged = neverFired ? null : rawTime
  const recent = isRecent(lastChanged, 60)
  const ago = shortAgo(lastChanged)
  const imgUrl = snapshotUrl(cameraState, bust)
  const videoUrl = cameraState?.attributes?.video_url ?? null
  const isPrivate = entity.private && !revealed

  const getIceConfig = useCallback((entityId) =>
    callWs({ type: 'camera/webrtc/get_client_config', entity_id: entityId }),
  [callWs])

  const openModal = useCallback(async () => {
    if (!entity.cameraId) return
    setLoading(true)
    setMediaStream(null)
    setHlsUrl(null)

    // 1. Try WebRTC (Ring's native protocol — works for all camera types)
    try {
      const stream = await webrtc.start(entity.cameraId, getIceConfig)
      setMediaStream(stream)
      setBust(Date.now())
      setModalOpen(true)
      setLoading(false)
      return
    } catch (e) {
      console.warn('[WebRTC] failed, trying HLS:', e.message)
      webrtc.stop()
    }

    // 2. Fall back to HLS
    try {
      const result = await getStreamUrl(entity.cameraId)
      const url = result?.url
      if (!url) throw new Error('No stream URL')
      setHlsUrl(HA_URL + url)
    } catch {
      // 3. Fall back to clip/snapshot (no stream source set — modal shows videoUrl or img)
    }

    setBust(Date.now())
    setModalOpen(true)
    setLoading(false)
  }, [entity.cameraId, webrtc, getIceConfig, getStreamUrl])

  const handleClick = () => {
    if (isPrivate) { setRevealed(true); return }
    openModal()
  }

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setMediaStream(null)
    setHlsUrl(null)
    webrtc.stop()
  }, [webrtc])

  const refresh = useCallback(async () => {
    if (!entity.cameraId) return
    setRefreshing(true)
    setBust(Date.now())
    setRefreshing(false)
  }, [entity.cameraId])

  return (
    <>
      <div
        style={{ border: `1px solid ${recent ? T.red : T.border}`, position: 'relative', overflow: 'hidden', cursor: loading ? 'wait' : 'pointer' }}
        onClick={handleClick}
      >
        {/* CRT scanline */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, background: 'repeating-linear-gradient(0deg,transparent 0 2px,rgba(127,217,200,0.04) 2px 3px)' }} />

        {/* Image area — aspect ratio scales naturally on all screen sizes */}
        <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg,#0a1418,#06080a)', position: 'relative', overflow: 'hidden' }}>
          {imgUrl && (
            <img
              src={imgUrl} alt={entity.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: isPrivate ? 'blur(16px) brightness(0.6)' : 'none' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', padding: '5px 7px', fontSize: 9, color: recent ? T.red : T.dim, letterSpacing: '0.08em' }}>
            <span>● REC</span>
            <span>{entity.icon.toUpperCase()}</span>
          </div>
          {recent && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, fontSize: 10, color: T.red, letterSpacing: '0.1em', fontWeight: 600, textShadow: `0 0 8px ${T.red}` }}>
              ⚠ MOTION
            </div>
          )}
          {loading && (
            <div style={{ position: 'absolute', bottom: 4, right: 6, zIndex: 3, fontSize: 9, color: T.cyan, letterSpacing: '0.08em' }}>
              CONNECTING…
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 7px', background: T.bg2, position: 'relative', zIndex: 3 }}>
          <span style={{ color: T.amber, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{entity.name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {entity.batteryId && <BatteryIndicator pct={batteryState ? parseFloat(batteryState.state) : null} />}
            <span style={{ color: recent ? T.red : T.dim, fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>
              {neverFired ? 'NO·DATA' : recent ? 'MOTION' : ago ? `T-${ago}` : '—'}
            </span>
          </span>
        </div>
      </div>

      {modalOpen && (
        <CameraModal
          name={entity.name}
          mediaStream={mediaStream}
          hlsUrl={hlsUrl}
          videoUrl={videoUrl}
          imgUrl={imgUrl}
          onClose={closeModal}
          onRefresh={refresh}
          refreshing={refreshing}
        />
      )}
    </>
  )
}

export function CameraCard({ entities, states, callService, getStreamUrl, callWs, sendRaw, subscribeMessage }) {
  const recentCount = entities.filter((e) => {
    const s = states[e.id]
    if (!s || s.state === 'unknown' || s.state === 'unavailable') return false
    const t = e.timeFrom === 'state' ? s.state : s.last_changed
    return isRecent(t, 60)
  }).length

  return (
    <TermFrame
      title="CAM.GRID"
      accent={recentCount ? T.red : T.cyan}
      right={recentCount ? `${recentCount} EVENT(S)` : 'ALL CLEAR'}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 6 }}>
        {entities.map((entity) => (
          <CamTile
            key={entity.id}
            entity={entity}
            state={states[entity.id]}
            cameraState={entity.cameraId ? states[entity.cameraId] : null}
            batteryState={entity.batteryId ? states[entity.batteryId] : null}
            getStreamUrl={getStreamUrl}
            callWs={callWs}
            sendRaw={sendRaw}
            subscribeMessage={subscribeMessage}
          />
        ))}
      </div>
    </TermFrame>
  )
}

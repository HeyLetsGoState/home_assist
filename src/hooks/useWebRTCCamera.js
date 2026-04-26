import { useRef, useCallback } from 'react'

export function useWebRTCCamera({ subscribeMessage, sendRaw }) {
  const pcRef = useRef(null)
  const unsubRef = useRef(null)
  const sessionIdRef = useRef(null)

  const stop = useCallback(() => {
    unsubRef.current?.()
    unsubRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    sessionIdRef.current = null
  }, [])

  const start = useCallback(async (entityId, getIceConfig) => {
    stop()

    // 1. Get Ring's STUN/TURN servers — proceed with empty config on failure
    let iceConfig = {}
    try {
      const cfg = await getIceConfig(entityId)
      iceConfig = cfg?.configuration ?? {}
    } catch { /* unsupported or network error — default ICE still works */ }

    // 2. Peer connection
    const pc = new RTCPeerConnection(iceConfig)
    pcRef.current = pc
    pc.addTransceiver('audio', { direction: 'recvonly' })
    pc.addTransceiver('video', { direction: 'recvonly' })

    // 3. Queue ICE candidates gathered before session_id arrives.
    //    MUST be wired up before createOffer(), which starts gathering.
    const candidateQueue = []
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      if (sessionIdRef.current) {
        sendRaw({
          type: 'camera/webrtc/candidate',
          entity_id: entityId,
          session_id: sessionIdRef.current,
          candidate: candidate.toJSON(),
        })
      } else {
        candidateQueue.push(candidate)
      }
    }

    // 4. Resolve when the first video track arrives
    const streamPromise = new Promise((resolve, reject) => {
      const stream = new MediaStream()
      const timeout = setTimeout(
        () => reject(new Error('No video track within 25s')), 25000
      )
      pc.ontrack = ({ track }) => {
        stream.addTrack(track)
        if (stream.getVideoTracks().length > 0) {
          clearTimeout(timeout)
          resolve(stream)
        }
      }
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          clearTimeout(timeout)
          reject(new Error('ICE connection failed'))
        }
      }
    })

    // 5. Create offer and set local description — this starts ICE gathering
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    // 6. Send offer to HA; wait for SDP answer via subscription events
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('No SDP answer within 15s')), 15000
      )

      unsubRef.current = subscribeMessage(
        { type: 'camera/webrtc/offer', entity_id: entityId, offer: offer.sdp },
        async (event) => {
          try {
            switch (event.type) {
              case 'session':
                sessionIdRef.current = event.session_id
                // Flush any candidates that arrived before we had the session_id
                for (const c of candidateQueue) {
                  sendRaw({
                    type: 'camera/webrtc/candidate',
                    entity_id: entityId,
                    session_id: event.session_id,
                    candidate: c.toJSON(),
                  })
                }
                candidateQueue.length = 0
                break

              case 'answer':
                await pc.setRemoteDescription({ type: 'answer', sdp: event.answer })
                clearTimeout(timeout)
                resolve()
                break

              case 'candidate':
                if (event.candidate) {
                  await pc.addIceCandidate(event.candidate).catch(() => {})
                }
                break

              case 'error':
                clearTimeout(timeout)
                reject(new Error(event.message || 'WebRTC signaling error'))
                break
            }
          } catch (err) {
            clearTimeout(timeout)
            reject(err)
          }
        }
      )
    })

    return streamPromise
  }, [stop, subscribeMessage, sendRaw])

  return { start, stop }
}

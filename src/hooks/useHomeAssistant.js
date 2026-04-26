import { useState, useEffect, useRef, useCallback } from 'react'
import { HA_WS_URL, HA_TOKEN } from '../config'

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]

export function useHomeAssistant() {
  const [states, setStates] = useState({})
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected | connecting | connected | error
  const ws = useRef(null)
  const msgId = useRef(1)
  const reconnectAttempt = useRef(0)
  const reconnectTimer = useRef(null)
  const pendingCalls = useRef({})
  const subscriptions = useRef({})

  const nextId = () => msgId.current++

  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    }
  }, [])

  const callService = useCallback(
    (domain, service, serviceData, { returnResponse = false } = {}) => {
      return new Promise((resolve, reject) => {
        const id = nextId()
        pendingCalls.current[id] = { resolve, reject }
        send({
          id,
          type: 'call_service',
          domain,
          service,
          service_data: serviceData,
          ...(returnResponse ? { return_response: true } : {}),
        })
        // Timeout after 8s
        setTimeout(() => {
          if (pendingCalls.current[id]) {
            delete pendingCalls.current[id]
            reject(new Error('Service call timed out'))
          }
        }, 8000)
      })
    },
    [send]
  )

  const subscribeMessage = useCallback((message, callback) => {
    const id = nextId()
    subscriptions.current[id] = callback
    send({ id, ...message })
    return () => { delete subscriptions.current[id] }
  }, [send])

  // One-shot WS call (request → result) for any message type
  const callWs = useCallback((message) =>
    new Promise((resolve, reject) => {
      const id = nextId()
      pendingCalls.current[id] = { resolve, reject }
      send({ id, ...message })
      setTimeout(() => {
        if (pendingCalls.current[id]) {
          delete pendingCalls.current[id]
          reject(new Error('WS call timed out'))
        }
      }, 10000)
    }), [send])

  // Fire-and-forget raw send (used for WebRTC candidate forwarding)
  const sendRaw = useCallback((message) => {
    const id = nextId()
    send({ id, ...message })
  }, [send])

  const getStreamUrl = useCallback(
    (entityId) =>
      new Promise((resolve, reject) => {
        const id = nextId()
        pendingCalls.current[id] = { resolve, reject }
        send({ id, type: 'camera/stream', entity_id: entityId, format: 'hls' })
        setTimeout(() => {
          if (pendingCalls.current[id]) {
            delete pendingCalls.current[id]
            reject(new Error('Stream request timed out'))
          }
        }, 15000)
      }),
    [send]
  )

  const toggleLight = useCallback(
    (entityId) => callService('light', 'toggle', { entity_id: entityId }),
    [callService]
  )

  const setLightBrightness = useCallback(
    (entityId, brightness) =>
      callService('light', 'turn_on', { entity_id: entityId, brightness }),
    [callService]
  )

  const setLightColor = useCallback(
    (entityId, hexColor) => {
      const r = parseInt(hexColor.slice(1, 3), 16)
      const g = parseInt(hexColor.slice(3, 5), 16)
      const b = parseInt(hexColor.slice(5, 7), 16)
      return callService('light', 'turn_on', { entity_id: entityId, rgb_color: [r, g, b] })
    },
    [callService]
  )

  const connect = useCallback(() => {
    if (ws.current) {
      // Null out handlers before closing so onclose doesn't trigger a reconnect loop
      ws.current.onclose = null
      ws.current.onerror = null
      ws.current.onmessage = null
      ws.current.close()
    }

    setConnectionStatus('connecting')
    const socket = new WebSocket(HA_WS_URL)
    ws.current = socket

    socket.onopen = () => {
      // HA sends auth_required first — handled in onmessage
    }

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'auth_required':
          socket.send(JSON.stringify({ type: 'auth', access_token: HA_TOKEN }))
          break

        case 'auth_ok':
          setConnectionStatus('connected')
          reconnectAttempt.current = 0

          // Fetch all current states
          send({ id: nextId(), type: 'get_states' })

          // Subscribe to all state_changed events
          send({
            id: nextId(),
            type: 'subscribe_events',
            event_type: 'state_changed',
          })
          break

        case 'auth_invalid':
          setConnectionStatus('error')
          socket.close()
          break

        case 'result':
          if (msg.success && Array.isArray(msg.result)) {
            // Bulk state load from get_states
            const stateMap = {}
            msg.result.forEach((s) => {
              stateMap[s.entity_id] = s
            })
            setStates(stateMap)
          }
          // Resolve pending service call if applicable
          if (pendingCalls.current[msg.id]) {
            const { resolve, reject } = pendingCalls.current[msg.id]
            delete pendingCalls.current[msg.id]
            msg.success ? resolve(msg.result) : reject(new Error(msg.error?.message))
          }
          // If a subscription failed (e.g. camera doesn't support WebRTC), propagate via event
          if (!msg.success && subscriptions.current[msg.id]) {
            subscriptions.current[msg.id]({ type: 'error', message: msg.error?.message })
            delete subscriptions.current[msg.id]
          }
          break

        case 'event':
          if (subscriptions.current[msg.id]) {
            subscriptions.current[msg.id](msg.event)
            break
          }
          if (msg.event?.event_type === 'state_changed') {
            const { entity_id, new_state } = msg.event.data
            setStates((prev) => ({
              ...prev,
              [entity_id]: new_state,
            }))
          }
          break

        default:
          break
      }
    }

    socket.onclose = (evt) => {
      if (evt.code === 4001) {
        // Auth failed — don't reconnect
        setConnectionStatus('error')
        return
      }
      setConnectionStatus('disconnected')
      const delay =
        RECONNECT_DELAYS[
          Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
        ]
      reconnectAttempt.current++
      reconnectTimer.current = setTimeout(connect, delay)
    }

    socket.onerror = () => {
      setConnectionStatus('error')
    }
  }, [send])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    states,
    connectionStatus,
    toggleLight,
    setLightBrightness,
    setLightColor,
    callService,
    getStreamUrl,
    callWs,
    sendRaw,
    subscribeMessage,
  }
}

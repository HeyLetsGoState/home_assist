import { useHomeAssistant } from './hooks/useHomeAssistant'
import { usePihole } from './hooks/usePihole'
import { useNetdata } from './hooks/useNetdata'
import { useBreakpoint } from './hooks/useBreakpoint'
import { ENTITIES } from './config'
import { useState, useEffect } from 'react'
import { T } from './components/TermFrame'
import { Header } from './components/Header'
import { ClockCard } from './components/ClockCard'
import { WeatherCard } from './components/WeatherCard'
import { LightCard } from './components/LightCard'
import { CameraCard } from './components/CameraCard'
import { PiholeCard } from './components/PiholeCard'
import { PlexCard } from './components/PlexCard'
import { NetworkCard } from './components/NetworkCard'
import { NetdataCard } from './components/NetdataCard'

function StatusBar({ connectionStatus, piholeStatus, netdataStatus }) {
  const services = [
    { label: 'HA',      ok: connectionStatus === 'connected' },
    { label: 'PIHOLE',  ok: piholeStatus === 'ok' },
    { label: 'NETDATA', ok: netdataStatus === 'ok' },
  ]
  const allOk = services.every(s => s.ok)
  return (
    <div style={{
      marginTop: 12, padding: '6px 12px',
      border: `1px solid ${allOk ? T.border : T.red}`,
      fontSize: 10, color: T.dim,
      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4,
    }}>
      <span>$ ha-monitor --watch --interval=1s</span>
      <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: allOk ? T.green : T.red }}>● {allOk ? 'PIPELINE OK' : 'DEGRADED'}</span>
        {services.map(s => (
          <span key={s.label} style={{ color: s.ok ? T.dim : T.red }}>
            {s.label}:<span style={{ color: s.ok ? T.green : T.red }}>{s.ok ? 'OK' : 'ERR'}</span>
          </span>
        ))}
        <span>{ENTITIES.cameras.length} CAM</span>
        <span>{ENTITIES.lights.length} LIGHT</span>
      </span>
    </div>
  )
}

export default function App() {
  const { states, connectionStatus, toggleLight, setLightBrightness, setLightColor, callService, getStreamUrl, callWs, sendRaw, subscribeMessage } = useHomeAssistant()
  const { stats: piholeStats, status: piholeStatus } = usePihole()
  const netdata = useNetdata()
  const bp = useBreakpoint()
  const isTablet = bp === 'md'
  const isMobile = bp === 'sm'

  const weatherState =
    states[ENTITIES.weather] ??
    states['weather.home'] ??
    states['weather.forecast_home'] ??
    null

  const sunState = states['sun.sun'] ?? null

  // Fetch daily forecast via service call (HA 2023.9+ removed forecast from weather attributes)
  const [weatherForecast, setWeatherForecast] = useState([])
  useEffect(() => {
    if (connectionStatus !== 'connected') return
    const entityId = ENTITIES.weather
    callService('weather', 'get_forecasts', { entity_id: entityId, type: 'daily' }, { returnResponse: true })
      .then((result) => {
        // HA WebSocket wraps return_response data under result.response
        const data = result?.response ?? result
        const fc = data?.[entityId]?.forecast ?? []
        setWeatherForecast(fc)
      })
      .catch(() => {})
  }, [connectionStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06080a',
      color: T.cyan,
      fontFamily: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: isMobile ? 11 : 12,
      lineHeight: 1.45,
      padding: isMobile ? '12px' : '20px 24px 24px',
      position: 'relative',
    }}>
      <style>{`
        button:focus-visible, input:focus-visible {
          outline: 1px solid #7fd9c8;
          outline-offset: 2px;
        }
        button:focus:not(:focus-visible), input:focus:not(:focus-visible) {
          outline: none;
        }
      `}</style>
      {/* CRT scanline overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100,
        background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(127,217,200,0.025) 2px 3px)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header connectionStatus={connectionStatus} />

        {isMobile ? (
          /* ── Mobile: single column ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ClockCard sunState={sunState} />
            <WeatherCard state={weatherState} sunState={sunState} forecast={weatherForecast} />
            <CameraCard entities={ENTITIES.cameras} states={states} getStreamUrl={getStreamUrl} callWs={callWs} sendRaw={sendRaw} subscribeMessage={subscribeMessage} />
            <LightCard entities={ENTITIES.lights} states={states} toggleLight={toggleLight} setLightBrightness={setLightBrightness} setLightColor={setLightColor} />
            <PiholeCard stats={piholeStats} status={piholeStatus} />
            <PlexCard states={states} />
            <NetworkCard states={states} entities={ENTITIES.unifi} />
            <NetdataCard {...netdata} />
          </div>
        ) : isTablet ? (
          /* ── Tablet: two columns ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 10 }}>
              <ClockCard sunState={sunState} />
              <WeatherCard state={weatherState} sunState={sunState} forecast={weatherForecast} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 10 }}>
              <CameraCard entities={ENTITIES.cameras} states={states} getStreamUrl={getStreamUrl} callWs={callWs} sendRaw={sendRaw} subscribeMessage={subscribeMessage} />
              <LightCard entities={ENTITIES.lights} states={states} toggleLight={toggleLight} setLightBrightness={setLightBrightness} setLightColor={setLightColor} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 10 }}>
              <PiholeCard stats={piholeStats} status={piholeStatus} />
              <PlexCard states={states} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
              <NetworkCard states={states} entities={ENTITIES.unifi} />
              <NetdataCard {...netdata} />
            </div>
          </div>
        ) : (
          /* ── Desktop: original three-row layout ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12 }}>
              <ClockCard sunState={sunState} />
              <WeatherCard state={weatherState} sunState={sunState} forecast={weatherForecast} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              <CameraCard entities={ENTITIES.cameras} states={states} getStreamUrl={getStreamUrl} callWs={callWs} sendRaw={sendRaw} subscribeMessage={subscribeMessage} />
              <LightCard entities={ENTITIES.lights} states={states} toggleLight={toggleLight} setLightBrightness={setLightBrightness} setLightColor={setLightColor} />
              <NetworkCard states={states} entities={ENTITIES.unifi} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)', gap: 12 }}>
              <PiholeCard stats={piholeStats} status={piholeStatus} />
              <PlexCard states={states} />
              <NetdataCard {...netdata} />
            </div>
          </div>
        )}

        <StatusBar connectionStatus={connectionStatus} piholeStatus={piholeStatus} netdataStatus={netdata.status} />
      </div>
    </div>
  )
}

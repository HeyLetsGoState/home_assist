import { sunTime } from '../utils/time'
import { TermFrame, T } from './TermFrame'

const COND_LABEL = {
  'clear-night':     'CLEAR·NIGHT',
  cloudy:            'CLOUDY',
  exceptional:       'EXCEPTIONAL',
  fog:               'FOGGY',
  hail:              'HAIL',
  lightning:         'LIGHTNING',
  'lightning-rainy': 'THUNDERSTORM',
  partlycloudy:      'PARTLY·CLOUDY',
  pouring:           'HEAVY·RAIN',
  rainy:             'RAINY',
  snowy:             'SNOWY',
  'snowy-rainy':     'SLEET',
  sunny:             'SUNNY',
  windy:             'WINDY',
  'windy-variant':   'WINDY',
}


export function WeatherCard({ state, sunState, forecast: forecastProp = [] }) {
  if (!state || state.state === 'unavailable') {
    return (
      <TermFrame title="ENV.OUTSIDE">
        <div style={{ color: T.dim, fontSize: 11 }}>$ sensor unavailable</div>
      </TermFrame>
    )
  }

  const a = state.attributes ?? {}
  const condition = COND_LABEL[state.state] ?? state.state.toUpperCase()
  const temp      = a.temperature
  const feelsLike = a.apparent_temperature ?? a.feelslike ?? a.feels_like
  const humidity  = a.humidity
  const windSpeed = a.wind_speed
  const windUnit  = (a.wind_speed_unit ?? 'mph').replace('m/s', 'mps')
  const tempUnit  = (a.temperature_unit ?? '°F').replace('°', '')
  // Use service-fetched forecast first, fall back to attributes (older HA)
  const forecast  = forecastProp.length > 0 ? forecastProp : (a.forecast ?? [])
  const sampled   = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const sunrise   = sunTime(sunState?.attributes?.next_rising)
  const sunset    = sunTime(sunState?.attributes?.next_setting)

  return (
    <TermFrame title="ENV.OUTSIDE" accent={T.cyan} right={`SAMPLED ${sampled}`}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: 52, color: T.amber, fontWeight: 600, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums', textShadow: `0 0 12px ${T.amber}55`,
          }}>
            {temp != null ? Math.round(temp) : '—'}°
            <span style={{ fontSize: 20, color: T.dim }}>{tempUnit}</span>
          </div>
          <div style={{ color: T.cyan, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {condition}
          </div>
        </div>

        <div style={{ flex: 1, fontSize: 10, color: T.cyan, lineHeight: 1.8 }}>
          {feelsLike != null && <div><span style={T.label}>FEELS    </span>{Math.round(feelsLike)}°{tempUnit}</div>}
          <div><span style={T.label}>HUMIDITY </span>{humidity != null ? `${humidity}%` : '—'}</div>
          <div><span style={T.label}>WIND     </span>{windSpeed != null ? `${Math.round(windSpeed)} ${windUnit}` : '—'}</div>
          {sunrise && sunset && <div><span style={T.label}>SUN      </span>{sunrise} → {sunset}</div>}
        </div>
      </div>

      {forecast.length > 0 && (
        <div style={{
          marginTop: 14,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(forecast.length, 7)}, 1fr)`,
          gap: 4, fontSize: 10,
          paddingTop: 10, borderTop: `1px dotted ${T.border}`,
        }}>
          {forecast.slice(0, 7).map((d, i) => {
            const day = i === 0
              ? 'TODAY'
              : new Date(d.datetime).toLocaleDateString([], { weekday: 'short' }).toUpperCase()
            return (
              <div key={i} style={{ textAlign: 'center', color: i === 0 ? T.amber : T.cyan }}>
                <div style={{ color: T.dim, fontSize: 9, marginBottom: 2 }}>{day}</div>
                <div style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {d.temperature != null ? `${Math.round(d.temperature)}°` : '—'}
                </div>
                {d.templow != null && (
                  <div style={{ color: T.dim, fontVariantNumeric: 'tabular-nums' }}>{Math.round(d.templow)}°</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </TermFrame>
  )
}

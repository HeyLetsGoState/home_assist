// ─── Home Assistant Configuration ───────────────────────────────────────────
export const HA_URL = import.meta.env.VITE_HA_URL || ''
export const HA_TOKEN = import.meta.env.VITE_HA_TOKEN || ''

// WebSocket URL derived from HA_URL
export const HA_WS_URL = HA_URL.replace(/^http/, 'ws') + '/api/websocket'
// ─── Entity IDs ──────────────────────────────────────────────────────────────
// Adjust these if HA named them differently. Check via Developer Tools → States.
export const ENTITIES = {
  lights: [
    { id: 'light.wiz_rgbww_tunable_06844a', name: 'Porch Light 1' },
    { id: 'light.wiz_rgbww_tunable_067ff0', name: 'Porch Light 2' },
    { id: 'light.mickey_lamp', name: 'Mickey Lamp' },
  ],
  cameras: [
    // All use sensor.*_last_activity — state is an ISO timestamp pulled from Ring cloud
    // cameraId = HA camera entity for live snapshot proxy
    { id: 'sensor.front_door_last_activity', name: 'Front Door', icon: 'doorbell', timeFrom: 'state', cameraId: 'camera.front_door_live_view', batteryId: 'sensor.front_door_battery', private: true },
    { id: 'sensor.garage_last_activity', name: 'Garage', icon: 'floodlight', timeFrom: 'state', cameraId: 'camera.garage_live_view', private: true },
    { id: 'sensor.yard_last_activity', name: 'Yard', icon: 'floodlight', timeFrom: 'state', cameraId: 'camera.yard_live_view', private: true },
    { id: 'sensor.downstairs_last_activity', name: 'Downstairs', icon: 'indoor', timeFrom: 'state', cameraId: 'camera.downstairs_live_view', batteryId: 'sensor.downstairs_battery', private: true },
  ],
  weather: 'weather.forecast_home', // fallback: 'weather.home'
  unifi: {
    cpu: 'sensor.dream_machine_special_edition_cpu_utilization',
    memory: 'sensor.dream_machine_special_edition_memory_utilization',
    state: 'sensor.dream_machine_special_edition_state',
    uptime: 'sensor.dream_machine_special_edition_uptime',
  },
}

// ─── Netdata Configuration ───────────────────────────────────────────────────
export const NETDATA_POLL_INTERVAL = 5_000 // ms

// ─── Pi-hole Configuration ───────────────────────────────────────────────────
// Pi-hole v6 requires a password for API access.
// Set VITE_PIHOLE_PASSWORD in .env, or paste it directly below.
export const PIHOLE_PASSWORD = import.meta.env.VITE_PIHOLE_PASSWORD || ''
export const PIHOLE_POLL_INTERVAL = 30_000 // ms

// ─── UI Constants ────────────────────────────────────────────────────────────
export const SPARKLINE_HISTORY = 30 // data points retained for sparkline charts

// ─── Media / Plex ────────────────────────────────────────────────────────────
export const PLEX_SENSOR = 'sensor.thebigblackbox'

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on :3000 with Pi-hole API proxy
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

**Docker / NAS deployment:**
```powershell
.\build-and-export.ps1   # Builds Docker image, exports ha-dashboard.tar.gz, opens folder
```
Then upload `ha-dashboard.tar.gz` to the NAS and import via Docker Manager. The container runs on port 3000 (mapped to nginx :80).

## Architecture

This is a single-page React dashboard for a Home Assistant setup, styled as a retro terminal (dark CRT aesthetic). No routing — one full-screen layout rendered in `App.jsx`.

### Data sources

**Home Assistant (`useHomeAssistant`)** — persistent WebSocket connection to HA's `/api/websocket`. On connect it fetches all states via `get_states`, then subscribes to `state_changed` events for live updates. The `states` object is a flat map of `entity_id → HA state object`, passed directly to cards. Service calls (light toggle, brightness, color, weather forecasts) go through the same socket via `callService`.

**Pi-hole (`usePihole`)** — HTTP polling every 30s against Pi-hole v6 API. Auth is handled by POSTing to `/api/auth` to get a session SID (cached for ~29 min). Both dev and production proxy `/api/pihole/*` to avoid CORS — Vite dev server proxies to `$PIHOLE_HOST`, nginx proxies the same in production.

### Configuration (`src/config.js`)

All entity IDs, URLs, and credentials live here. `VITE_*` env vars override defaults at build time (baked in — not runtime-injectable without additional patterns). For dev overrides copy `.env.example` → `.env`.

Key entities:
- Lights: WiZ RGBWW bulbs + Mickey Lamp
- Cameras: Ring sensors (`sensor.*_last_activity`) with paired `camera.*_live_view` entities
- Weather: `weather.forecast_home`
- Network: UniFi Dream Machine Special Edition sensors
- Pi-hole: password-based v6 auth

### UI system (`src/components/TermFrame.jsx`)

`TermFrame` is the base card wrapper — bordered dark panel with a CLI-style header. `T` is the shared color palette (cyan, amber, dim, red, green, bg2, border). `TermSparkline` renders an inline SVG sparkline. All cards import from this file.

### Card layout (App.jsx)

Three CSS grid rows:
1. Clock (1.4fr) + Weather (1fr)
2. Cameras (1.2fr) + Lights (1fr) + Network (1fr)
3. Pi-hole (1.3fr) + Plex (1fr) + Netdata (1fr)

Cards receive slices of `states` and relevant HA action functions as props. `CameraCard` uses `callService` directly (for camera snapshot fetching). `PlexCard` reads HA media player states.

### Production build

Two-stage Docker build: Node 20 alpine builds the Vite bundle → nginx 1.27 alpine serves `dist/`. nginx config handles SPA fallback, Pi-hole CORS proxy, and static asset caching (1 year, immutable).

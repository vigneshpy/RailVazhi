# ரெயில் வழி — Rail Vazhi

> **Know before you go.**  
> Predicts railway level crossing (gate) closure times so you can decide when to leave.

---

## The Problem

In Sivakasi (and hundreds of tier-2/3 towns across Tamil Nadu), railway gates close **15-20 minutes before a train passes** and reopen **5 minutes after**. A single crossing can cause a 20-30 minute delay with no warning.

Rail Vazhi tells you: given your route, which gates will be closed, when, and for which train — so you can leave at the right time.

---

## Screenshots

<table>
<tr>
<td align="center"><b>Home</b></td>
<td align="center"><b>Location Picker</b></td>
<td align="center"><b>Results</b></td>
</tr>
<tr>
<td><img src="docs/screenshots/01-home.png" width="260" alt="Home screen with route form"/></td>
<td><img src="docs/screenshots/02-location-picker.png" width="260" alt="Location picker with map and search"/></td>
<td><img src="docs/screenshots/03-results-viewport.png" width="260" alt="Gate predictions with recommendation"/></td>
</tr>
</table>

---

## Features

- **Map-based location picker** — search by name (Nominatim) or tap the map to drop a pin
- **Reverse geocoding** — tapped locations show a street name, not raw coordinates
- **Gate predictions** — closure windows with confidence levels (Live / Scheduled)
- **Recommendation** — "Leave by 4:08 PM" or "Wait until 4:42 PM"
- **Saved routes** — bookmark frequent routes in localStorage
- **Gate alerts** — browser notifications (foreground + background via service worker) when a saved route's gate is about to close
- **Mobile-first** — 380px min viewport, tested on Android Chrome

---

## Architecture

```
railvazhi/
├── apps/
│   ├── api/          Node.js + Express + TypeScript  :4000
│   └── web/          Next.js 14 App Router            :3001
├── packages/
│   └── shared/       TypeScript types shared by both
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

**Data flow:**

```
Phone/Browser
    → POST /api/predict { from, to }
    → getRoute (OSRM)
    → getGatesOnRoute (PostGIS ST_DWithin)
    → predictGateStatus (NTES live + schedule fallback)
    → PredictionResponse { route, gatesOnRoute, recommendation }
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js 20, Express, TypeScript (strict) |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Train data | NTES scraping (axios + cheerio), schedule fallback |
| Routing | OSRM public demo server |
| Maps | OpenStreetMap + Leaflet |
| Frontend | Next.js 14 App Router, Tailwind CSS |
| Monorepo | pnpm workspaces |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for the database)

### 1. Clone and install

```bash
git clone https://github.com/vigneshpy/RailVazhi.git
cd RailVazhi
pnpm install
```

### 2. Start the database

```bash
docker run -d --name railvazhi-pg \
  -e POSTGRES_USER=railvazhi \
  -e POSTGRES_PASSWORD=railvazhi \
  -e POSTGRES_DB=railvazhi \
  -p 5433:5432 \
  postgis/postgis:16-3.4
```

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — default values work with the docker command above
```

### 4. Run migrations and seed data

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

### 5. Start development servers

```bash
pnpm dev
# API: http://localhost:4000
# Web: http://localhost:3001
```

### Test on your phone

Find your laptop IP:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Update `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://<your-laptop-ip>:4000
```

Then open `http://<your-laptop-ip>:3001` in your phone's browser.

---

## Useful Scripts

```bash
# Type-check everything
pnpm lint

# Test individual services
pnpm --filter api test:ntes 16128        # NTES live/schedule fetch
pnpm --filter api test:routing           # OSRM route (Sivakasi to Virudhunagar)
pnpm --filter api test:gates             # Gates on a route
pnpm --filter api test:prediction G001  # Prediction for a specific gate

# Validation (logs predictions to CSV every 5 min)
pnpm --filter api validate --gate=G001 --hours=6 --interval=5
```

---

## Adding More Gates / Stations

1. Look up level crossings on [OpenRailwayMap](https://www.openrailwaymap.org/) or [Overpass Turbo](https://overpass-turbo.eu/)
   - Query: `node["railway"="level_crossing"]` in your corridor bounding box
2. Add stations and gates to `apps/api/src/db/seed.sql`
3. Re-run `pnpm --filter api db:seed` (idempotent)
4. Add the station to the `STATIONS` array in `apps/web/src/components/RouteForm.tsx`

---

## Environment Variables

### `apps/api/.env`

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API server port |
| `NODE_ENV` | `development` | Environment |
| `DATABASE_URL` | `postgres://railvazhi:railvazhi@localhost:5433/railvazhi` | PostgreSQL connection |
| `WEB_ORIGIN` | (auto) | CORS allowed origin |

### `apps/web/.env.local`

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend URL (must be reachable from the browser) |

---

## License

MIT

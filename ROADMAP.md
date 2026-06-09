# Rail Vazhi — Roadmap

This roadmap tracks what has been built, what is in progress, and what is planned.

---

## Done

### Infrastructure
- [x] pnpm monorepo with `apps/api`, `apps/web`, `packages/shared`
- [x] PostgreSQL + PostGIS database (Docker)
- [x] TypeScript strict mode across all packages
- [x] Shared types package (`@railvazhi/shared`)
- [x] Pino structured logging with request IDs

### Backend
- [x] Database schema: stations, lines, gates, schedules, events
- [x] Seed data: Sivakasi-Madurai corridor (SVKS, TTL, VPT, SRT, KSBT, MDU)
- [x] Real gate coordinates from OpenStreetMap Overpass API
- [x] NTES service with 5-minute cache and schedule fallback
- [x] OSRM routing with 20s timeout and retry
- [x] PostGIS gate intersection (ST_DWithin 500m buffer)
- [x] Prediction engine: ETA + closure windows + confidence (HIGH/MEDIUM/LOW)
- [x] `POST /api/predict` with zod validation
- [x] `GET /api/gates`, `GET /api/trains/:trainNo`, `GET /health`
- [x] CORS configured for LAN access (mobile testing)
- [x] Validation script: CSV output for ground-truth comparison

### Frontend
- [x] Next.js 14 App Router, mobile-first (380px min)
- [x] Tamil + English header branding
- [x] Full-screen map location picker (search + tap + GPS)
- [x] Nominatim search with debounce
- [x] Reverse geocoding on map tap and GPS
- [x] Leaflet route map with gate markers (green/amber/red)
- [x] Gate cards with closure timeline bar
- [x] Recommendation banner ("Leave by" / "Wait until")
- [x] Saved routes (favourites) in localStorage
- [x] Rename and delete favourites
- [x] Browser notification permission flow
- [x] Foreground polling (5 min) for saved routes
- [x] Background service worker for gate alerts when tab is closed

---

## In Progress

- [ ] Verify and fix gate coordinates with field survey or OSM crosscheck
- [ ] Verify train schedules against current NTES timetable
- [ ] Measure actual `distance_from_upstream_km` for all gates

---

## Planned

### Live Data (High Priority)
- [ ] Fix NTES live scraping (currently blocked by HTTP/2 parser issue)
  - Option A: Puppeteer/Playwright headless browser
  - Option B: RailYatri or Where Is My Train API
  - Option C: Reverse-engineer the NTES mobile app API
- [ ] Improve confidence to HIGH once live data is working

### Corridor Expansion
- [ ] Virudhunagar to Kovilpatti gates
- [ ] Madurai city gates (busy urban crossings)
- [ ] Add more Tamil Nadu corridors (Tirunelveli, Coimbatore, Salem)
- [ ] Community-contributed gate data pipeline

### Accuracy
- [ ] Ground-truth validation: compare predictions against actual gate closures
- [ ] Calibrate `AVG_SPEED_KMPH` per corridor from real data
- [ ] Handle express vs passenger train speed differences
- [ ] Account for trains that skip certain stops

### UX
- [ ] Tamil language UI strings (i18n)
- [ ] "Which train is causing this?" expandable detail on gate card
- [ ] Departure time countdown ("Gate closes in 8 min")
- [ ] PWA manifest + install prompt for Android home screen
- [ ] Offline mode: show last-known gate status when API is unreachable
- [ ] Share a route link

### Mobile App
- [ ] React Native WebView wrapper (the web app is the source of truth)
- [ ] Android APK via Expo
- [ ] iOS TestFlight build

### Backend
- [ ] Rate limiting on `/api/predict`
- [ ] Request-level caching for identical route+time queries
- [ ] Admin API to update gate/schedule data without reseeding
- [ ] Health monitoring and uptime alerts

### Data Quality
- [ ] Crowdsourced gate corrections (user reports actual closure time)
- [ ] Integrate with OpenRailwayMap data pipeline for gate updates
- [ ] Scheduled timetable refresh from NTES

---

## Known Limitations

| Issue | Impact | Planned fix |
|---|---|---|
| NTES live scraping blocked | All predictions are schedule-based (`confidence: LOW`) | Puppeteer or mobile API reverse-engineering |
| Gate coordinates are approximate | `test:gates` finds few gates on route | Field survey or OSM contribution |
| `AVG_SPEED_KMPH` is a constant (40 km/h) | ETA accuracy varies | Calibrate per corridor from real runs |
| IST stored as UTC in scheduled times | 5h30m offset must be handled carefully | Already handled; validate in Phase 12 |
| OSRM demo server has occasional timeouts | Prediction fails | Self-host OSRM for production |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Gate data and schedule verification are the highest-value contributions right now.

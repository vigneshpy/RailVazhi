# Contributing to Rail Vazhi

Thanks for your interest in contributing. Rail Vazhi is an open-source project aimed at helping commuters in India deal with railway gate delays. Contributions of all kinds are welcome.

---

## Ways to Contribute

| Type | Examples |
|---|---|
| Gate data | Add/verify gate coordinates for your town's corridor |
| Station data | Add stations missing from the seed data |
| Train schedules | Verify or correct timetable data against NTES |
| Bug fixes | See open issues tagged `bug` |
| New corridors | Extend coverage beyond Sivakasi-Madurai |
| UI improvements | Better mobile UX, Tamil language strings |
| Live data | Improve the NTES scraper or add an alternative source |

---

## Development Setup

Follow the steps in [README.md](README.md#getting-started). You need Node 20+, pnpm, and Docker.

---

## Project Structure

```
apps/api/src/
  db/           schema.sql, seed.sql, client.ts, migrate.ts
  services/     ntes.ts, routing.ts, gates.ts, prediction.ts
  routes/       predict.ts, gates.ts, trains.ts

apps/web/src/
  app/          Next.js pages and layout
  components/   RouteForm, GateCard, RouteMap, etc.
  hooks/        useFavourites, useRouteWatcher, useServiceWorker

packages/shared/src/
  index.ts      All shared TypeScript types
```

---

## Coding Guidelines

- **TypeScript strict mode** — no `any` without a comment explaining why
- **No em dashes** in code, comments, or UI strings (use hyphens)
- **No UI component libraries** — pure Tailwind only
- **No ORMs** — raw `pg` queries only in the backend
- **Comments explain WHY**, not what — skip obvious comments
- **date-fns** for all date math, no raw `Date` arithmetic
- **pino** for all backend logging — no `console.log`
- Each phase/feature should be testable in isolation

---

## Adding Gate Data

Gate coordinates are the most valuable contribution right now. The seed data has placeholder or approximate coordinates for some gates.

### Step 1 - Get the lat/lng of the crossing

**Easiest: Google Maps**

1. Open [Google Maps](https://maps.google.com)
2. Navigate to the crossing location (search the road name or nearby landmark)
3. Zoom in until you can see the railway line crossing the road
4. Right-click exactly on the point where the rail crosses the road
5. The first item in the menu is the coordinates, e.g. `9.4711, 77.8013`
6. Click those numbers to copy them - first number is `lat`, second is `lng`

**More accurate: Overpass Turbo (finds official OSM railway crossing nodes)**

1. Open [overpass-turbo.eu](https://overpass-turbo.eu)
2. Pan the map to your crossing area
3. Paste this query and click Run:
   ```
   node["railway"="level_crossing"]({{bbox}});
   out body;
   ```
4. Blue dots appear on all level crossings in the visible area
5. Click the dot at your crossing - a popup shows the node details
6. The coordinates appear as `lat` and `lon` in the popup (e.g. `9.4711608`, `77.8013653`)

**Also works: OpenStreetMap directly**

1. Open [openstreetmap.org](https://openstreetmap.org) and zoom into your crossing
2. Click the crossing point on the map
3. In the left panel, click "Query features" and click the crossing node
4. The URL changes to something like `?mlat=9.4711&mlon=77.8013` - those are your coordinates

---

### Step 2 - Measure distance_from_upstream_km

This is how far the gate is from the upstream station along the railway line.

**Quick method: Google Maps distance tool**

1. Right-click on the upstream station (e.g. Thiruthangal) and choose "Measure distance"
2. Click along the railway line to the gate location
3. The total shown is your `distance_from_upstream_km` value (round to 1 decimal)

Upstream means the station a train coming from Sivakasi would pass *before* reaching this gate. Check `seed.sql` for the `upstream_station_code` column to know which station that is.

---

### Step 3 - Update the seed file

Open `apps/api/src/db/seed.sql` and find the gate entry (search for the gate ID like `G003`):

```sql
('G003', 'Gate Name', 9.XXXXXX, 77.XXXXXX, 'SVKS', 'TTL', X.X),
-- columns:   id       name        lat        lng    upstream downstream  distance_km
```

Replace the placeholder `lat`, `lng`, and `distance_from_upstream_km` with your measured values.

---

### Step 4 - Apply and verify

```bash
pnpm --filter api db:seed        # re-seeds (safe to run multiple times)
pnpm --filter api test:gates     # should show this gate on a Sivakasi-Madurai route
```

If the gate doesn't appear in `test:gates`, the coordinates may be too far from the road routing line (more than 500 m). Double-check you placed the pin on the crossing point, not a nearby station or road.

---

## Adding a New Corridor

1. Add stations to `railway_stations` in `seed.sql`
2. Add the railway line geometry as a `LINESTRING` in `railway_lines`
3. Add gates in `railway_gates` with correct upstream/downstream station codes
4. Add train schedules in `train_schedules` (verify against NTES timetable)
5. Add the new stations to `STATIONS` in `apps/web/src/components/RouteForm.tsx`

---

## Submitting a Pull Request

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `pnpm lint` — must pass with zero errors
4. Test your change with the relevant test script
5. Open a PR with a clear description of what changed and why
6. Reference any NTES train numbers or OSM node IDs you used

---

## Reporting Issues

Open an issue with:
- Your location / corridor
- The gate or train number affected
- What you expected vs what happened
- Any relevant logs from the API (`pnpm dev:api`)

---

## Questions

Open a GitHub Discussion or file an issue tagged `question`.

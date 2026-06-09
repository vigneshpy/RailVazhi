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

Gate coordinates are the most valuable contribution right now. The seed data has placeholder coordinates for some gates.

To add or fix a gate:

1. Find the crossing on [OpenRailwayMap](https://www.openrailwaymap.org/)
   - Enable the "Railroad infrastructure" layer
   - Level crossings show as small squares on the line
   - Click the node to get its exact lat/lng

2. Alternatively use Overpass Turbo:
   ```
   node["railway"="level_crossing"]({{bbox}});out body;
   ```

3. Edit `apps/api/src/db/seed.sql` — update the `lat`, `lng`, and `distance_from_upstream_km` for the gate

4. Measure `distance_from_upstream_km` using the measurement tool on OpenRailwayMap or QGIS

5. Re-run the seed: `pnpm --filter api db:seed`

6. Verify the gate appears in `pnpm --filter api test:gates`

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

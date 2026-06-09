import "dotenv/config";
import { getRoute } from "../src/services/routing.js";
import { getGatesOnRoute } from "../src/services/gates.js";
import { pool } from "../src/db/client.js";
import { logger } from "../src/logger.js";

// Default: Sivakasi to Virudhunagar
const source = { lat: 9.4533, lng: 77.7989 };
const destination = { lat: 9.5810, lng: 77.9580 };

try {
  logger.info("fetching route...");
  const route = await getRoute(source, destination);
  logger.info({ distanceKm: route.distanceKm, durationMin: route.durationMin }, "route fetched");

  const gates = await getGatesOnRoute(route.polyline);
  console.log(JSON.stringify(gates, null, 2));

  if (!gates.length) {
    logger.warn("no gates found - gate coordinates may be too far from road route");
    logger.warn("update lat/lng in seed.sql with exact coordinates from OpenRailwayMap");
  }
} catch (err) {
  logger.error({ err }, "test failed");
  process.exit(1);
} finally {
  await pool.end();
}

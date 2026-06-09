import type { LatLng, Route, GeoJSONLineString } from "@railvazhi/shared";
import { logger } from "../logger.js";

const OSRM_BASE = "https://router.project-osrm.org";
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 2;

type OsrmRoute = {
  distance: number;
  duration: number;
  geometry: {
    coordinates: [number, number][];
    type: "LineString";
  };
};

type OsrmResponse = {
  code: string;
  routes: OsrmRoute[];
};

export async function getRoute(source: LatLng, destination: LatLng): Promise<Route> {
  const coords = `${source.lng},${source.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  logger.info({ source, destination }, "fetching route from OSRM");

  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`OSRM returned HTTP ${res.status}`);
      const data = await res.json() as OsrmResponse;
      if (data.code !== "Ok" || !data.routes.length) throw new Error(`OSRM error: ${data.code}`);

      const route = data.routes[0];
      return {
        polyline: { type: "LineString", coordinates: route.geometry.coordinates },
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
      };
    } catch (err) {
      lastErr = err;
      logger.warn({ err, attempt }, "OSRM request failed, retrying...");
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}

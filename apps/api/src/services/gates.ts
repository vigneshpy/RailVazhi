import { pool } from "../db/client.js";
import { logger } from "../logger.js";
import type { GeoJSONLineString, Gate, GateOnRoute } from "@railvazhi/shared";

// Gates within this distance of the road route are considered "on route"
const GATE_BUFFER_METRES = 500;

type GateRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  upstream_station_code: string;
  downstream_station_code: string;
  closure_buffer_min: number;
  opening_buffer_min: number;
  distance_from_upstream_km: number;
  distance_from_origin_m: number;
};

export async function getGatesOnRoute(routePolyline: GeoJSONLineString): Promise<GateOnRoute[]> {
  // Build a GeoJSON string for the route to pass into PostGIS
  const routeGeoJson = JSON.stringify(routePolyline);

  // ST_LineLocatePoint returns a fraction (0-1) of where along the route the gate falls.
  // Multiplying by ST_Length gives distance from origin in metres.
  // We filter by ST_DWithin to only return gates within GATE_BUFFER_METRES of the road route.
  const { rows } = await pool.query<GateRow>(
    `SELECT
       g.id,
       g.name,
       g.lat,
       g.lng,
       g.upstream_station_code,
       g.downstream_station_code,
       g.closure_buffer_min,
       g.opening_buffer_min,
       g.distance_from_upstream_km,
       ST_Length(
         ST_GeomFromGeoJSON($1)::geography
       ) * ST_LineLocatePoint(
         ST_GeomFromGeoJSON($1),
         g.geom
       ) AS distance_from_origin_m
     FROM railway_gates g
     WHERE ST_DWithin(
       g.geom::geography,
       ST_GeomFromGeoJSON($1)::geography,
       $2
     )
     ORDER BY distance_from_origin_m ASC`,
    [routeGeoJson, GATE_BUFFER_METRES]
  );

  logger.info({ count: rows.length, bufferMetres: GATE_BUFFER_METRES }, "gates found on route");

  return rows.map((r): GateOnRoute => ({
    gate: rowToGate(r),
    distanceFromOriginKm: Math.round((r.distance_from_origin_m / 1000) * 10) / 10,
  }));
}

function rowToGate(r: GateRow): Gate {
  return {
    id: r.id,
    name: r.name,
    location: { lat: r.lat, lng: r.lng },
    upstreamStationCode: r.upstream_station_code,
    downstreamStationCode: r.downstream_station_code,
    closureBufferMin: r.closure_buffer_min,
    openingBufferMin: r.opening_buffer_min,
    distanceFromUpstreamKm: r.distance_from_upstream_km,
  };
}

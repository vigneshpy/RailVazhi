import { Router, type Router as ExpressRouter } from "express";
import { pool } from "../db/client.js";
import { logger } from "../logger.js";
import type { Gate } from "@railvazhi/shared";

export const gatesRouter: ExpressRouter = Router();

gatesRouter.get("/gates", async (_req, res) => {
  try {
    const { rows } = await pool.query<{
      id: string; name: string; lat: number; lng: number;
      upstream_station_code: string; downstream_station_code: string;
      closure_buffer_min: number; opening_buffer_min: number;
      distance_from_upstream_km: number;
    }>(
      `SELECT id, name, lat, lng, upstream_station_code, downstream_station_code,
              closure_buffer_min, opening_buffer_min, distance_from_upstream_km
       FROM railway_gates ORDER BY id`
    );

    const gates: Gate[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      location: { lat: r.lat, lng: r.lng },
      upstreamStationCode: r.upstream_station_code,
      downstreamStationCode: r.downstream_station_code,
      closureBufferMin: r.closure_buffer_min,
      openingBufferMin: r.opening_buffer_min,
      distanceFromUpstreamKm: r.distance_from_upstream_km,
    }));

    res.json(gates);
  } catch (err) {
    logger.error({ err }, "failed to fetch gates");
    res.status(500).json({ error: "failed to fetch gates" });
  }
});

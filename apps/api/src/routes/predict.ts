import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { getRoute } from "../services/routing.js";
import { getGatesOnRoute } from "../services/gates.js";
import { predictGateStatus } from "../services/prediction.js";
import { logger } from "../logger.js";
import type { PredictionResponse, Recommendation } from "@railvazhi/shared";

export const predictRouter: ExpressRouter = Router();

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const PredictBodySchema = z.object({
  from: LatLngSchema,
  to: LatLngSchema,
});

predictRouter.post("/predict", async (req, res) => {
  const parsed = PredictBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid request", details: parsed.error.flatten() });
    return;
  }

  const { from, to } = parsed.data;

  try {
    const route = await getRoute(from, to);
    const gatesOnRoute = await getGatesOnRoute(route.polyline);

    const gatesWithPredictions = await Promise.all(
      gatesOnRoute.map(async (g) => {
        const prediction = await predictGateStatus(g.gate.id, 2);
        return { gate: g.gate, distanceFromOriginKm: g.distanceFromOriginKm, prediction };
      })
    );

    const recommendation = buildRecommendation(gatesWithPredictions);

    const body: PredictionResponse = {
      route,
      gatesOnRoute: gatesWithPredictions,
      recommendation,
    };

    res.json(body);
  } catch (err) {
    logger.error({ err }, "prediction request failed");
    res.status(500).json({ error: "prediction failed" });
  }
});

type GateWithPrediction = PredictionResponse["gatesOnRoute"][number];

function buildRecommendation(gates: GateWithPrediction[]): Recommendation {
  const now = new Date();

  // Find any gate currently closed or closing soon
  const blockedGate = gates.find(
    (g) =>
      g.prediction.currentStatus === "CLOSED" ||
      g.prediction.currentStatus === "CLOSING_SOON"
  );

  if (!blockedGate) {
    return { reason: "All gates are open. Good to go." };
  }

  if (blockedGate.prediction.currentStatus === "CLOSED") {
    // Find when the current closure ends
    const activeWindow = blockedGate.prediction.closureWindows.find(
      (w) => new Date(w.start) <= now && new Date(w.end) >= now
    );
    if (activeWindow) {
      return {
        waitUntil: activeWindow.end,
        reason: `${blockedGate.gate.name} is closed for train ${activeWindow.trainNo}. Wait until gate opens.`,
      };
    }
  }

  if (blockedGate.prediction.currentStatus === "CLOSING_SOON") {
    // Find the next closure start
    const nextWindow = blockedGate.prediction.closureWindows.find(
      (w) => new Date(w.start) > now
    );
    if (nextWindow) {
      // Suggest leaving now if you can beat the closure
      const minutesUntilClose = Math.round(
        (new Date(nextWindow.start).getTime() - now.getTime()) / 60_000
      );
      return {
        leaveBy: new Date(now.getTime() + Math.max(0, minutesUntilClose - 2) * 60_000).toISOString(),
        reason: `${blockedGate.gate.name} closes in ${minutesUntilClose} min for train ${nextWindow.trainNo}. Leave now to clear it.`,
      };
    }
  }

  return { reason: "Check gate status before leaving." };
}

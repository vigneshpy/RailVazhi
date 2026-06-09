import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { logger } from "./logger.js";
import { checkDbConnection } from "./db/client.js";
import { predictRouter } from "./routes/predict.js";
import { gatesRouter } from "./routes/gates.js";
import { trainsRouter } from "./routes/trains.js";
import type { HealthResponse } from "@railvazhi/shared";

const app = express();
const PORT = parseInt(process.env.PORT ?? "4000", 10);

app.use(cors({ origin: process.env.WEB_ORIGIN ?? /^http:\/\/192\.168\.\d+\.\d+:\d+$|^http:\/\/localhost:\d+$/ }));
app.use(express.json());

// 30 predict requests per minute per IP - each call hits OSRM + PostGIS + NTES
const predictLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests - try again in a minute" },
});

// 120 requests per minute for cheap read endpoints
const readLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests - try again in a minute" },
});

// Attach a request id to every incoming request for log correlation
app.use((req, res, next) => {
  const reqId = Math.random().toString(36).slice(2, 9);
  res.locals["reqId"] = reqId;
  logger.info({ reqId, method: req.method, url: req.url }, "request");
  next();
});

app.get("/health", async (_req, res) => {
  const dbOk = await checkDbConnection();
  const body: HealthResponse = { status: "ok", db: dbOk ? "connected" : "disconnected" };
  res.json(body);
});

app.use("/api/predict", predictLimiter);
app.use("/api", predictRouter);
app.use("/api", readLimiter);
app.use("/api", gatesRouter);
app.use("/api", trainsRouter);

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "Rail Vazhi API started");
});

import "dotenv/config";
import express from "express";
import cors from "cors";
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

app.use("/api", predictRouter);
app.use("/api", gatesRouter);
app.use("/api", trainsRouter);

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "Rail Vazhi API started");
});

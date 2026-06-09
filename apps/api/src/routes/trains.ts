import { Router, type Router as ExpressRouter } from "express";
import { NtesService } from "../services/ntes.js";
import { logger } from "../logger.js";

export const trainsRouter: ExpressRouter = Router();

const ntesService = new NtesService();

trainsRouter.get("/trains/:trainNo", async (req, res) => {
  const { trainNo } = req.params;
  if (!/^\d{4,5}$/.test(trainNo)) {
    res.status(400).json({ error: "invalid train number" });
    return;
  }

  try {
    const status = await ntesService.getLiveTrainStatus(trainNo);
    res.json(status);
  } catch (err) {
    logger.error({ err, trainNo }, "failed to fetch train status");
    res.status(404).json({ error: `train ${trainNo} not found` });
  }
});

import "dotenv/config";
import { writeFileSync, appendFileSync, existsSync } from "fs";
import { predictGateStatus } from "../src/services/prediction.js";
import { pool } from "../src/db/client.js";
import { logger } from "../src/logger.js";

const args = process.argv.slice(2);
const gateArg = args.find((a) => a.startsWith("--gate="))?.split("=")[1];
const hoursArg = args.find((a) => a.startsWith("--hours="))?.split("=")[1];
const intervalArg = args.find((a) => a.startsWith("--interval="))?.split("=")[1];

const GATE_ID = gateArg ?? "G001";
const WITHIN_HOURS = parseInt(hoursArg ?? "6", 10);
const INTERVAL_MIN = parseInt(intervalArg ?? "5", 10);

const outFile = `validate_${GATE_ID}_${new Date().toISOString().slice(0, 10)}.csv`;
const header = "timestamp,gate_id,predicted_start,predicted_end,train_no,confidence,ground_truth\n";

if (!existsSync(outFile)) {
  writeFileSync(outFile, header);
  logger.info({ outFile }, "created CSV");
}

logger.info({ gateId: GATE_ID, withinHours: WITHIN_HOURS, intervalMin: INTERVAL_MIN }, "starting validation loop");
logger.info("press Ctrl+C to stop");

async function runOnce() {
  try {
    const result = await predictGateStatus(GATE_ID, WITHIN_HOURS);
    const ts = new Date().toISOString();

    if (!result.closureWindows.length) {
      const row = `${ts},${GATE_ID},,,,,\n`;
      appendFileSync(outFile, row);
      logger.info({ gateId: GATE_ID, status: result.currentStatus }, "no closures predicted");
      return;
    }

    for (const w of result.closureWindows) {
      const row = `${ts},${GATE_ID},${w.start},${w.end},${w.trainNo},${w.confidence},\n`;
      appendFileSync(outFile, row);
    }

    logger.info({ gateId: GATE_ID, windows: result.closureWindows.length, status: result.currentStatus }, "logged predictions");
  } catch (err) {
    logger.error({ err }, "prediction error in validation loop");
  }
}

// Run once immediately, then on interval
await runOnce();

const timer = setInterval(runOnce, INTERVAL_MIN * 60 * 1000);

// Clean shutdown
process.on("SIGINT", async () => {
  clearInterval(timer);
  logger.info({ outFile }, "validation stopped, output saved");
  await pool.end();
  process.exit(0);
});

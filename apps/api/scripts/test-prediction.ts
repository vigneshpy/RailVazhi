import "dotenv/config";
import { predictGateStatus } from "../src/services/prediction.js";
import { pool } from "../src/db/client.js";
import { logger } from "../src/logger.js";

const gateId = process.argv[2] ?? "G001";
const withinHours = Number(process.argv[3] ?? 12);

try {
  logger.info({ gateId, withinHours }, "predicting gate status...");
  const result = await predictGateStatus(gateId, withinHours);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  logger.error({ err }, "prediction failed");
  process.exit(1);
} finally {
  await pool.end();
}

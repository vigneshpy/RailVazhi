import "dotenv/config";
import { NtesService } from "../src/services/ntes.js";
import { pool } from "../src/db/client.js";
import { logger } from "../src/logger.js";

const trainNo = process.argv[2];
if (!trainNo) {
  console.error("Usage: pnpm --filter api test:ntes <trainNo>");
  console.error("Example: pnpm --filter api test:ntes 16128");
  process.exit(1);
}

const svc = new NtesService();

try {
  logger.info({ trainNo }, "fetching train status...");
  const status = await svc.getLiveTrainStatus(trainNo);
  console.log(JSON.stringify(status, null, 2));
} catch (err) {
  logger.error({ err }, "failed");
  process.exit(1);
} finally {
  await pool.end();
}

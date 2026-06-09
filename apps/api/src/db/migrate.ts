import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./client.js";
import { logger } from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");
  logger.info("running migrations...");
  try {
    await pool.query(sql);
    logger.info("migrations complete");
  } catch (err) {
    logger.error({ err }, "migration failed");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

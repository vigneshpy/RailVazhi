import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pool } from "./client.js";
import { logger } from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed() {
  const sql = readFileSync(join(__dirname, "seed.sql"), "utf8");
  logger.info("seeding database...");
  try {
    await pool.query(sql);
    logger.info("seed complete");

    const { rows } = await pool.query(`
      SELECT
        (SELECT count(*) FROM railway_stations) AS stations,
        (SELECT count(*) FROM railway_lines)    AS lines,
        (SELECT count(*) FROM railway_gates)    AS gates,
        (SELECT count(*) FROM train_schedules)  AS schedules
    `);
    logger.info(rows[0], "row counts after seed");
  } catch (err) {
    logger.error({ err }, "seed failed");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();

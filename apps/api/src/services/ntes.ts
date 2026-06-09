import axios from "axios";
import * as cheerio from "cheerio";
import { pool } from "../db/client.js";
import { logger } from "../logger.js";
import type { TrainStatus, StationEvent } from "@railvazhi/shared";

const NTES_BASE = "https://enquiry.indianrail.gov.in/ntes";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ITrainDataProvider {
  getLiveTrainStatus(trainNo: string): Promise<TrainStatus>;
}

export class NtesService implements ITrainDataProvider {
  async getLiveTrainStatus(trainNo: string): Promise<TrainStatus> {
    const cached = await this.getCached(trainNo);
    if (cached) return cached;

    try {
      const status = await this.scrapeNtes(trainNo);
      await this.cacheEvents(status);
      return status;
    } catch (err) {
      logger.warn({ err, trainNo }, "NTES scrape failed, falling back to schedule");
      const status = await this.buildFromSchedule(trainNo);
      await this.cacheEvents(status);
      return status;
    }
  }

  // Returns cached result if fetched within the last 5 minutes
  private async getCached(trainNo: string): Promise<TrainStatus | null> {
    const { rows } = await pool.query<{
      station_code: string;
      event_type: string;
      scheduled_time: Date;
      actual_time: Date | null;
      delay_min: number | null;
      fetched_at: Date;
    }>(
      `SELECT station_code, event_type, scheduled_time, actual_time, delay_min, fetched_at
       FROM train_events
       WHERE train_no = $1
         AND fetched_at > NOW() - INTERVAL '5 minutes'
       ORDER BY scheduled_time DESC`,
      [trainNo]
    );

    if (!rows.length) return null;

    logger.info({ trainNo }, "returning cached NTES result");
    return this.rowsToTrainStatus(trainNo, rows, true);
  }

  private async scrapeNtes(trainNo: string): Promise<TrainStatus> {
    // NTES serves over HTTP/2; use native fetch (Node 18+) instead of axios
    // which only speaks HTTP/1.1 and gets a parse error on NTES responses
    const url = `${NTES_BASE}/ntes5/trainInfo.jsp?trainNo=${trainNo}&trainName=&srcStn=&destStn=`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    let html: string;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RailVazhi/1.0)",
          Accept: "text/html",
        },
      });
      if (!res.ok) throw new Error(`NTES returned HTTP ${res.status}`);
      html = await res.text();
    } finally {
      clearTimeout(timer);
    }

    return this.parseNtesHtml(trainNo, html);
  }

  private parseNtesHtml(trainNo: string, html: string): TrainStatus {
    const $ = cheerio.load(html);

    // NTES train status table has rows with station, scheduled time, actual time, delay
    // The structure: each <tr> in the status table is one station stop
    const rows: Array<{
      station_code: string;
      event_type: "ARR" | "DEP";
      scheduled_time: Date;
      actual_time: Date | null;
      delay_min: number | null;
      fetched_at: Date;
    }> = [];

    const trainName = $(".train-name, .trainName, h2").first().text().trim() || trainNo;
    let currentStationCode = "";

    // NTES uses a table with class "table" or "trainTimeTable"
    $("table tr").each((_i, row) => {
      const cells = $(row).find("td");
      if (cells.length < 4) return;

      const stnCell = $(cells[0]).text().trim();
      const schedCell = $(cells[1]).text().trim();
      const actualCell = $(cells[2]).text().trim();
      const delayCell = $(cells[3]).text().trim();

      // Station code is typically in parentheses: "Madurai Jn (MDU)"
      const codeMatch = stnCell.match(/\(([A-Z]+)\)/);
      if (!codeMatch) return;

      const stationCode = codeMatch[1];
      const scheduledTime = parseNtesTime(schedCell);
      const actualTime = actualCell && actualCell !== "-" ? parseNtesTime(actualCell) : null;
      const delayMin = delayCell && delayCell !== "-" ? parseInt(delayCell, 10) : null;

      if (!scheduledTime) return;

      // Mark as current station if actual time is populated but next station hasn't departed
      if (actualTime) currentStationCode = stationCode;

      rows.push({
        station_code: stationCode,
        event_type: "DEP",
        scheduled_time: scheduledTime,
        actual_time: actualTime,
        delay_min: isNaN(delayMin ?? NaN) ? null : delayMin,
        fetched_at: new Date(),
      });
    });

    if (!rows.length) {
      throw new Error(`no station rows parsed from NTES for train ${trainNo}`);
    }

    return this.rowsToTrainStatus(trainNo, rows, false, trainName, currentStationCode);
  }

  private rowsToTrainStatus(
    trainNo: string,
    rows: Array<{
      station_code: string;
      event_type: string;
      scheduled_time: Date;
      actual_time: Date | null;
      delay_min: number | null;
      fetched_at: Date;
    }>,
    isLive: boolean,
    trainName = trainNo,
    currentStationCode = ""
  ): TrainStatus {
    const now = new Date();
    const fetchedAt = rows[0]?.fetched_at ?? now;

    const events: StationEvent[] = rows.map((r) => ({
      stationCode: r.station_code,
      stationName: r.station_code, // resolved to name in higher layers
      scheduledTime: r.scheduled_time.toISOString(),
      actualTime: r.actual_time?.toISOString(),
      delayMin: r.delay_min ?? 0,
      eventType: r.event_type as "ARR" | "DEP",
    }));

    const lastPassed = events.filter((e) => e.actualTime != null);
    const lastEvent = lastPassed.at(-1) ?? events[0];

    const upcoming = events.filter(
      (e) => !e.actualTime && new Date(e.scheduledTime) > now
    );

    return {
      trainNo,
      trainName,
      currentStationCode: currentStationCode || lastEvent.stationCode,
      lastEvent,
      upcomingStations: upcoming,
      isLive,
      fetchedAt: fetchedAt.toISOString(),
    };
  }

  private async cacheEvents(status: TrainStatus): Promise<void> {
    const allEvents = [status.lastEvent, ...status.upcomingStations];
    for (const event of allEvents) {
      await pool.query(
        `INSERT INTO train_events (train_no, station_code, event_type, scheduled_time, actual_time, delay_min, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [
          status.trainNo,
          event.stationCode,
          event.eventType,
          event.scheduledTime,
          event.actualTime ?? null,
          event.delayMin,
        ]
      );
    }
  }

  // Fallback: build TrainStatus from the scheduled timetable in our DB
  private async buildFromSchedule(trainNo: string): Promise<TrainStatus> {
    const { rows } = await pool.query<{
      station_code: string;
      arrival_scheduled: string | null;
      departure_scheduled: string | null;
    }>(
      `SELECT station_code, arrival_scheduled::text, departure_scheduled::text
       FROM train_schedules
       WHERE train_no = $1
       ORDER BY COALESCE(arrival_scheduled, departure_scheduled)`,
      [trainNo]
    );

    if (!rows.length) {
      throw new Error(`no schedule found for train ${trainNo}`);
    }

    const now = new Date();
    const todayPrefix = now.toISOString().slice(0, 10);

    const events: StationEvent[] = rows.map((r) => {
      // pg returns TIME as "HH:MM:SS" string; slice to HH:MM for ISO construction
      const rawTime = r.departure_scheduled ?? r.arrival_scheduled ?? "00:00:00";
      const timeStr = rawTime.slice(0, 5); // "HH:MM"
      return {
        stationCode: r.station_code,
        stationName: r.station_code,
        scheduledTime: `${todayPrefix}T${timeStr}:00.000Z`,
        delayMin: 0,
        eventType: r.departure_scheduled ? "DEP" : "ARR",
      };
    });

    const upcoming = events.filter((e) => new Date(e.scheduledTime) > now);
    const lastEvent = events.find((e) => new Date(e.scheduledTime) <= now) ?? events[0];

    return {
      trainNo,
      trainName: trainNo,
      currentStationCode: lastEvent.stationCode,
      lastEvent,
      upcomingStations: upcoming,
      isLive: false,
      fetchedAt: now.toISOString(),
    };
  }
}

function parseNtesTime(raw: string): Date | null {
  // NTES formats: "06:30", "06:30 (06:45)", "06:30*"
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const d = new Date(now);
  d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return d;
}

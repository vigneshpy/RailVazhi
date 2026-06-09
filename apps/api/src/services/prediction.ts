import { pool } from "../db/client.js";
import { logger } from "../logger.js";
import { NtesService } from "./ntes.js";
import type { GatePrediction, GateStatus, ClosureWindow, ConfidenceLevel } from "@railvazhi/shared";

// Indian Railways branch lines average ~40 km/h between stops
const AVG_SPEED_KMPH = 40;

// Gate is "closing soon" if a closure starts within this many minutes
const CLOSING_SOON_THRESHOLD_MIN = 30;

// IST offset in milliseconds (UTC+5:30)
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const ntesService = new NtesService();

type GateRow = {
  id: string;
  closure_buffer_min: number;
  opening_buffer_min: number;
  distance_from_upstream_km: number;
  upstream_station_code: string;
  downstream_station_code: string;
};

type ScheduleRow = {
  train_no: string;
  departure_scheduled: string | null;   // "HH:MM:SS" in IST
  arrival_scheduled: string | null;
};

export async function predictGateStatus(
  gateId: string,
  withinHours = 2
): Promise<GatePrediction> {
  const gate = await loadGate(gateId);
  const nowUtc = new Date();
  const nowIst = new Date(nowUtc.getTime() + IST_OFFSET_MS);

  const trains = await findTrainsApproachingGate(gate, nowIst, withinHours);
  logger.info({ gateId, trainCount: trains.length }, "trains approaching gate in window");

  const closureWindows: ClosureWindow[] = [];

  for (const t of trains) {
    const window = await buildClosureWindow(t, gate, nowUtc);
    if (window) closureWindows.push(window);
  }

  closureWindows.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const currentStatus = computeCurrentStatus(closureWindows, nowUtc);

  return { gateId, currentStatus, closureWindows };
}

async function loadGate(gateId: string): Promise<GateRow> {
  const { rows } = await pool.query<GateRow>(
    `SELECT id, closure_buffer_min, opening_buffer_min,
            distance_from_upstream_km, upstream_station_code, downstream_station_code
     FROM railway_gates WHERE id = $1`,
    [gateId]
  );
  if (!rows.length) throw new Error(`gate not found: ${gateId}`);
  return rows[0];
}

// Returns trains whose scheduled departure from the upstream station falls
// within [now, now + withinHours] in IST
async function findTrainsApproachingGate(
  gate: GateRow,
  nowIst: Date,
  withinHours: number
): Promise<Array<ScheduleRow & { trainName: string }>> {
  // We look for trains that stop at BOTH the upstream and downstream station,
  // so we know they pass through the gate
  const { rows } = await pool.query<ScheduleRow & { trainName: string }>(
    `SELECT s.train_no,
            s.departure_scheduled::text,
            s.arrival_scheduled::text,
            s.train_no AS "trainName"
     FROM train_schedules s
     WHERE s.station_code = $1
       AND EXISTS (
         SELECT 1 FROM train_schedules s2
         WHERE s2.train_no = s.train_no
           AND s2.station_code = $2
       )`,
    [gate.upstream_station_code, gate.downstream_station_code]
  );

  // Filter to trains whose upstream departure falls in the window.
  // Scheduled times are IST stored as TIME; compare against current IST time.
  const windowEnd = new Date(nowIst.getTime() + withinHours * 60 * 60 * 1000);
  const nowMinutes = nowIst.getHours() * 60 + nowIst.getMinutes();
  const windowEndMinutes = windowEnd.getHours() * 60 + windowEnd.getMinutes();

  return rows.filter((r) => {
    const timeStr = r.departure_scheduled ?? r.arrival_scheduled;
    if (!timeStr) return false;
    const [h, m] = timeStr.split(":").map(Number);
    const schedMinutes = h * 60 + m;
    // Handle midnight wrap: if window crosses midnight, include trains after 0:00
    if (windowEndMinutes < nowMinutes) {
      return schedMinutes >= nowMinutes || schedMinutes <= windowEndMinutes;
    }
    return schedMinutes >= nowMinutes && schedMinutes <= windowEndMinutes;
  });
}

async function buildClosureWindow(
  train: ScheduleRow & { trainName: string },
  gate: GateRow,
  nowUtc: Date
): Promise<ClosureWindow | null> {
  let trainStatus;
  try {
    trainStatus = await ntesService.getLiveTrainStatus(train.train_no);
  } catch (err) {
    logger.warn({ err, trainNo: train.train_no }, "could not get train status for prediction");
    return null;
  }

  // Find the upstream station event in the live status
  const upstreamEvent =
    trainStatus.upcomingStations.find((e) => e.stationCode === gate.upstream_station_code) ??
    trainStatus.lastEvent.stationCode === gate.upstream_station_code
      ? trainStatus.lastEvent
      : null;

  // Scheduled departure from upstream in IST, converted to UTC for math
  const schedTimeStr = train.departure_scheduled ?? train.arrival_scheduled;
  if (!schedTimeStr) return null;

  const [sh, sm] = schedTimeStr.split(":").map(Number);
  const todayUtc = new Date(nowUtc);
  // Convert IST scheduled time to UTC: subtract 5h30m
  todayUtc.setUTCHours(sh, sm, 0, 0);
  const scheduledDepartureUtc = new Date(todayUtc.getTime() - IST_OFFSET_MS);

  // Travel time from upstream station to the gate
  const travelToGateMin = (gate.distance_from_upstream_km / AVG_SPEED_KMPH) * 60;

  let etaAtGate: Date;
  let confidence: ConfidenceLevel;

  if (upstreamEvent?.actualTime) {
    // Train has live data for the upstream station
    const actualDeparture = new Date(upstreamEvent.actualTime);
    etaAtGate = new Date(actualDeparture.getTime() + travelToGateMin * 60 * 1000);

    const ageMs = nowUtc.getTime() - new Date(trainStatus.fetchedAt).getTime();
    confidence = ageMs < 15 * 60 * 1000 ? "HIGH" : "MEDIUM";
  } else if (trainStatus.isLive) {
    // Train is running but no update for this specific station - use schedule + known delay
    const delayMs = (trainStatus.lastEvent.delayMin ?? 0) * 60 * 1000;
    etaAtGate = new Date(scheduledDepartureUtc.getTime() + delayMs + travelToGateMin * 60 * 1000);
    confidence = "MEDIUM";
  } else {
    // No live data at all - pure schedule
    etaAtGate = new Date(scheduledDepartureUtc.getTime() + travelToGateMin * 60 * 1000);
    confidence = "LOW";
  }

  const closureStart = new Date(etaAtGate.getTime() - gate.closure_buffer_min * 60 * 1000);
  const closureEnd = new Date(etaAtGate.getTime() + gate.opening_buffer_min * 60 * 1000);

  logger.debug({
    trainNo: train.train_no,
    gateId: gate.id,
    etaAtGate: etaAtGate.toISOString(),
    confidence,
  }, "computed gate closure window");

  return {
    start: closureStart.toISOString(),
    end: closureEnd.toISOString(),
    trainNo: train.train_no,
    trainName: trainStatus.trainName,
    confidence,
  };
}

function computeCurrentStatus(windows: ClosureWindow[], nowUtc: Date): GateStatus {
  const nowMs = nowUtc.getTime();

  for (const w of windows) {
    const start = new Date(w.start).getTime();
    const end = new Date(w.end).getTime();

    if (nowMs >= start && nowMs <= end) return "CLOSED";

    if (start > nowMs && start - nowMs <= CLOSING_SOON_THRESHOLD_MIN * 60 * 1000) {
      return "CLOSING_SOON";
    }
  }

  return "OPEN";
}

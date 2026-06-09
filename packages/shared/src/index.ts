export type LatLng = {
  lat: number;
  lng: number;
};

export type Station = {
  code: string;
  name: string;
  location: LatLng;
};

export type Gate = {
  id: string;
  name: string;
  location: LatLng;
  upstreamStationCode: string;
  downstreamStationCode: string;
  closureBufferMin: number;
  openingBufferMin: number;
  distanceFromUpstreamKm: number;
};

export type Train = {
  trainNo: string;
  name: string;
};

export type StationEvent = {
  stationCode: string;
  stationName: string;
  scheduledTime: string;   // ISO string
  actualTime?: string;     // ISO string, present if live
  delayMin: number;
  eventType: "ARR" | "DEP";
};

export type TrainStatus = {
  trainNo: string;
  trainName: string;
  currentStationCode: string;
  lastEvent: StationEvent;
  upcomingStations: StationEvent[];
  isLive: boolean;         // false = fell back to scheduled timetable
  fetchedAt: string;       // ISO string
};

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

// HIGH: live update within 15 min
// MEDIUM: train running but no recent update
// LOW: scheduled timetable only
export type ClosureWindow = {
  start: string;           // ISO string
  end: string;             // ISO string
  trainNo: string;
  trainName: string;
  confidence: ConfidenceLevel;
};

export type GateStatus = "OPEN" | "CLOSING_SOON" | "CLOSED";

export type GatePrediction = {
  gateId: string;
  currentStatus: GateStatus;
  closureWindows: ClosureWindow[];
};

export type GeoJSONLineString = {
  type: "LineString";
  coordinates: [number, number][];  // [lng, lat] pairs (GeoJSON order)
};

export type Route = {
  polyline: GeoJSONLineString;
  distanceKm: number;
  durationMin: number;
};

export type GateOnRoute = {
  gate: Gate;
  distanceFromOriginKm: number;
};

export type RouteWithGates = {
  route: Route;
  gatesOnRoute: GateOnRoute[];
};

export type Recommendation = {
  leaveBy?: string;        // ISO string - leave now and clear all gates
  waitUntil?: string;      // ISO string - wait for current closure to end
  reason: string;
};

export type PredictionResponse = {
  route: Route;
  gatesOnRoute: Array<{
    gate: Gate;
    distanceFromOriginKm: number;
    prediction: GatePrediction;
  }>;
  recommendation: Recommendation;
};

export type HealthResponse = {
  status: "ok" | "error";
  db: "connected" | "disconnected";
};

"use client";

import { format } from "date-fns";
import type { Gate, GatePrediction } from "@railvazhi/shared";

const STATUS_STYLES: Record<string, { pill: string; label: string }> = {
  OPEN:         { pill: "bg-green-100 text-green-700",  label: "Open" },
  CLOSING_SOON: { pill: "bg-amber-100 text-amber-700",  label: "Closing Soon" },
  CLOSED:       { pill: "bg-red-100 text-red-700",      label: "Closed" },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  HIGH:   "Live",
  MEDIUM: "Live (delayed)",
  LOW:    "Scheduled",
};

type Props = {
  gate: Gate;
  distanceFromOriginKm: number;
  prediction: GatePrediction;
};

export function GateCard({ gate, distanceFromOriginKm, prediction }: Props) {
  const style = STATUS_STYLES[prediction.currentStatus] ?? STATUS_STYLES["OPEN"];

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-800">{gate.name}</p>
          <p className="text-xs text-gray-400">{distanceFromOriginKm} km from start</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${style.pill}`}>
          {style.label}
        </span>
      </div>

      {/* Closure windows */}
      {prediction.closureWindows.length === 0 ? (
        <p className="text-xs text-gray-400">No closures in the next 2 hours</p>
      ) : (
        <div className="space-y-2">
          {prediction.closureWindows.map((w, i) => (
            <ClosureRow key={i} window={w} />
          ))}
        </div>
      )}

      {/* Timeline bar */}
      {prediction.closureWindows.length > 0 && (
        <TimelineBar windows={prediction.closureWindows} />
      )}
    </div>
  );
}

function ClosureRow({ window: w }: { window: GatePrediction["closureWindows"][number] }) {
  const start = new Date(w.start);
  const end = new Date(w.end);
  const confidence = CONFIDENCE_LABEL[w.confidence] ?? w.confidence;

  return (
    <div className="flex items-center justify-between text-xs">
      <div>
        <span className="font-medium text-gray-700">
          {format(start, "h:mm a")} - {format(end, "h:mm a")}
        </span>
        <span className="text-gray-400 ml-1">({w.trainNo})</span>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs ${
        w.confidence === "HIGH" ? "bg-green-50 text-green-600" :
        w.confidence === "MEDIUM" ? "bg-amber-50 text-amber-600" :
        "bg-gray-100 text-gray-500"
      }`}>
        {confidence}
      </span>
    </div>
  );
}

// Visualizes the next 2 hours as a horizontal bar with closure windows highlighted
function TimelineBar({ windows }: { windows: GatePrediction["closureWindows"] }) {
  const now = Date.now();
  const windowMs = 2 * 60 * 60 * 1000;
  const end = now + windowMs;

  return (
    <div className="relative h-3 bg-green-100 rounded-full overflow-hidden">
      {windows.map((w, i) => {
        const start = new Date(w.start).getTime();
        const wEnd = new Date(w.end).getTime();
        if (wEnd < now || start > end) return null;

        const left = Math.max(0, ((start - now) / windowMs) * 100);
        const width = Math.min(100 - left, ((wEnd - Math.max(start, now)) / windowMs) * 100);

        return (
          <div
            key={i}
            className="absolute top-0 h-full bg-red-500 opacity-80"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        );
      })}
      {/* "Now" marker */}
      <div className="absolute top-0 left-0 h-full w-0.5 bg-gray-500 opacity-60" />
    </div>
  );
}

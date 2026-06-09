"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Favourite } from "./useFavourites";
import type { PredictionResponse } from "@railvazhi/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

// Track last notified status per gate to avoid repeat alerts
type LastStatus = Record<string, string>; // gateId -> status

export function useRouteWatcher(watched: Favourite[]) {
  const lastStatusRef = useRef<LastStatus>({});
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAll = useCallback(async () => {
    if (!watched.length) return;
    if (document.visibilityState === "hidden") return;
    if (Notification.permission !== "granted") return;

    for (const fav of watched) {
      try {
        const res = await fetch(`${API_URL}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: fav.from.latLng, to: fav.to.latLng }),
        });
        if (!res.ok) continue;

        const data = await res.json() as PredictionResponse;

        for (const { gate, prediction } of data.gatesOnRoute) {
          const key = `${fav.id}:${gate.id}`;
          const prev = lastStatusRef.current[key];
          const curr = prediction.currentStatus;

          if (curr === prev) continue;
          lastStatusRef.current[key] = curr;

          if (curr === "CLOSING_SOON") {
            const next = prediction.closureWindows[0];
            const minsAway = next
              ? Math.round((new Date(next.start).getTime() - Date.now()) / 60_000)
              : 0;
            notify(
              `Gate closing in ${minsAway} min`,
              `${gate.name} on your "${fav.label}" route closes for train ${next?.trainNo ?? ""}`
            );
          } else if (curr === "CLOSED") {
            const next = prediction.closureWindows.find(
              (w) => new Date(w.start) <= new Date() && new Date(w.end) >= new Date()
            );
            notify(
              `Gate is CLOSED`,
              `${gate.name} on "${fav.label}" is closed${next ? ` for train ${next.trainNo}` : ""}`
            );
          } else if (curr === "OPEN" && (prev === "CLOSED" || prev === "CLOSING_SOON")) {
            notify(`Gate is open`, `${gate.name} on "${fav.label}" is now open`);
          }
        }
      } catch {
        // silently skip — network error or API down
      }
    }
  }, [watched]);

  useEffect(() => {
    if (!watched.length) return;

    checkAll();
    timerRef.current = setInterval(checkAll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [watched, checkAll]);
}

function notify(title: string, body: string) {
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: title, // collapse duplicates
  });
}

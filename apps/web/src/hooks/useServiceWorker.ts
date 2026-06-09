"use client";

import { useEffect } from "react";
import type { Favourite } from "./useFavourites";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useServiceWorker(favourites: Favourite[]) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      const sw = reg.active ?? reg.installing ?? reg.waiting;
      if (!sw) return;

      if (favourites.length && Notification.permission === "granted") {
        sw.postMessage({ type: "START_WATCHING", apiUrl: API_URL, favourites });
      } else {
        sw.postMessage({ type: "STOP_WATCHING" });
      }
    });
  }, [favourites]);
}

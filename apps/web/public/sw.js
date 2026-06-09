// Service worker for background gate polling
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const STORAGE_KEY = "railvazhi:favourites";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Receive config from the page (API URL + favourites)
self.addEventListener("message", (e) => {
  if (e.data?.type === "START_WATCHING") {
    startWatching(e.data.apiUrl, e.data.favourites);
  }
  if (e.data?.type === "STOP_WATCHING") {
    stopWatching();
  }
});

let timer = null;
let lastStatus = {};

function startWatching(apiUrl, favourites) {
  if (timer) clearInterval(timer);
  lastStatus = {};
  timer = setInterval(() => checkAll(apiUrl, favourites), POLL_INTERVAL_MS);
}

function stopWatching() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function checkAll(apiUrl, favourites) {
  for (const fav of favourites) {
    try {
      const res = await fetch(`${apiUrl}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fav.from.latLng, to: fav.to.latLng }),
      });
      if (!res.ok) continue;
      const data = await res.json();

      for (const { gate, prediction } of data.gatesOnRoute) {
        const key = `${fav.id}:${gate.id}`;
        const prev = lastStatus[key];
        const curr = prediction.currentStatus;
        if (curr === prev) continue;
        lastStatus[key] = curr;

        if (curr === "CLOSING_SOON") {
          const next = prediction.closureWindows[0];
          const minsAway = next
            ? Math.round((new Date(next.start).getTime() - Date.now()) / 60000)
            : 0;
          self.registration.showNotification(`Gate closing in ${minsAway} min`, {
            body: `${gate.name} on "${fav.label}" closes for train ${next?.trainNo ?? ""}`,
            icon: "/icon-192.png",
            tag: key,
          });
        } else if (curr === "CLOSED") {
          self.registration.showNotification("Gate is CLOSED", {
            body: `${gate.name} on "${fav.label}" is closed`,
            icon: "/icon-192.png",
            tag: key,
          });
        } else if (curr === "OPEN" && (prev === "CLOSED" || prev === "CLOSING_SOON")) {
          self.registration.showNotification("Gate is open", {
            body: `${gate.name} on "${fav.label}" is now open`,
            icon: "/icon-192.png",
            tag: key,
          });
        }
      }
    } catch {
      // network error — skip silently
    }
  }
}

// Tap on notification opens the app
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});

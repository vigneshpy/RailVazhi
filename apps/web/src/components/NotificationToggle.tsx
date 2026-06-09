"use client";

import { useState, useEffect } from "react";

type Props = {
  onGranted: () => void;
};

export function NotificationToggle({ onGranted }: Props) {
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setMounted(true);
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  // Render nothing until client-side mount so server HTML matches first paint
  if (!mounted || typeof Notification === "undefined") return null;
  if (permission === "denied") {
    return (
      <p className="text-xs text-gray-400 text-center">
        Notifications blocked. Enable in browser settings to get gate alerts.
      </p>
    );
  }
  if (permission === "granted") {
    return (
      <p className="text-xs text-green-600 text-center flex items-center justify-center gap-1">
        <span>&#128276;</span> Gate alerts enabled for saved routes
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === "granted") onGranted();
      }}
      className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:border-rail-blue hover:text-rail-blue transition-colors"
    >
      <span>&#128276;</span> Enable gate alerts for saved routes
    </button>
  );
}

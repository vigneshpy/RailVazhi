"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { LatLng } from "@railvazhi/shared";

const LocationPickerModal = dynamic(
  () => import("./LocationPickerModal").then((m) => m.LocationPickerModal),
  { ssr: false }
);

export type LocationValue = { latLng: LatLng; name: string };

type Props = {
  onSubmit: (from: LocationValue, to: LocationValue) => void;
  loading: boolean;
};

export function RouteForm({ onSubmit, loading }: Props) {
  const [from, setFrom]       = useState<LocationValue | null>(null);
  const [to, setTo]           = useState<LocationValue | null>(null);
  const [picker, setPicker]   = useState<"from" | "to" | null>(null);
  const [error, setError]     = useState("");

  function handleConfirm(loc: LatLng, name: string) {
    if (picker === "from") setFrom({ latLng: loc, name });
    if (picker === "to")   setTo({ latLng: loc, name });
    setPicker(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!from) { setError("Select a starting point."); return; }
    if (!to)   { setError("Select a destination."); return; }
    onSubmit(from, to);
  }

  const fieldClass =
    "w-full flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-3 text-sm text-left hover:border-rail-blue transition-colors cursor-pointer";

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 space-y-3">

        {/* FROM */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            From
          </label>
          <button type="button" onClick={() => setPicker("from")} className={fieldClass}>
            <span className="text-rail-blue text-base">&#9679;</span>
            <span className={from ? "text-gray-800 font-medium truncate" : "text-gray-400"}>
              {from ? from.name : "Search or pick on map"}
            </span>
            {from && (
              <span
                className="ml-auto text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0"
                onClick={(e) => { e.stopPropagation(); setFrom(null); }}
              >
                &times;
              </span>
            )}
          </button>
        </div>

        {/* TO */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            To
          </label>
          <button type="button" onClick={() => setPicker("to")} className={fieldClass}>
            <span className="text-rail-red text-base">&#9679;</span>
            <span className={to ? "text-gray-800 font-medium truncate" : "text-gray-400"}>
              {to ? to.name : "Search or pick on map"}
            </span>
            {to && (
              <span
                className="ml-auto text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0"
                onClick={(e) => { e.stopPropagation(); setTo(null); }}
              >
                &times;
              </span>
            )}
          </button>
        </div>

        {error && <p className="text-rail-red text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading || !from || !to}
          className="w-full bg-rail-blue text-white font-semibold py-2.5 rounded-lg disabled:opacity-40 transition-opacity"
        >
          {loading ? "Checking gates..." : "Check gates on my route"}
        </button>
      </form>

      {/* Full-screen map picker */}
      {picker && (
        <LocationPickerModal
          label={picker === "from" ? "From" : "To"}
          initial={picker === "from" ? from?.latLng : to?.latLng}
          onConfirm={handleConfirm}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

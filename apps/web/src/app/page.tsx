"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { RouteForm, type LocationValue } from "../components/RouteForm";
import { GateCard } from "../components/GateCard";
import { RecommendationBanner } from "../components/RecommendationBanner";
import { FavouritesBar } from "../components/FavouritesBar";
import { NotificationToggle } from "../components/NotificationToggle";
import { useFavourites } from "../hooks/useFavourites";
import { useRouteWatcher } from "../hooks/useRouteWatcher";
import { useServiceWorker } from "../hooks/useServiceWorker";
import type { PredictionResponse } from "@railvazhi/shared";

const RouteMap = dynamic(
  () => import("../components/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="w-full h-[280px] bg-gray-100 rounded-xl animate-pulse" /> }
);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function HomePage() {
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<PredictionResponse | null>(null);
  const [from, setFrom]                 = useState<LocationValue | null>(null);
  const [to, setTo]                     = useState<LocationValue | null>(null);
  const [error, setError]               = useState("");
  const [savedThisRoute, setSavedThisRoute] = useState(false);

  const { favourites, add, remove, rename } = useFavourites();
  useRouteWatcher(favourites);
  useServiceWorker(favourites);

  async function runPrediction(fromVal: LocationValue, toVal: LocationValue) {
    setLoading(true);
    setError("");
    setResult(null);
    setSavedThisRoute(false);
    setFrom(fromVal);
    setTo(toVal);
    try {
      const res = await fetch(`${API_URL}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromVal.latLng, to: toVal.latLng }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json() as PredictionResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function saveToFavourites() {
    if (!from || !to) return;
    add({ label: `${from.name} to ${to.name}`, from, to });
    setSavedThisRoute(true);
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <RouteForm onSubmit={runPrediction} loading={loading} />

      <NotificationToggle onGranted={() => {}} />

      <FavouritesBar
        favourites={favourites}
        onSelect={runPrediction}
        onRemove={remove}
        onRename={rename}
      />

      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {result && from && to && (
        <>
          <RecommendationBanner recommendation={result.recommendation} />

          {!savedThisRoute ? (
            <button
              type="button"
              onClick={saveToFavourites}
              className="w-full flex items-center justify-center gap-2 border border-rail-amber text-rail-amber font-medium text-sm py-2 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <span>&#9733;</span> Save this route to favourites
            </button>
          ) : (
            <p className="text-center text-xs text-gray-400">Route saved to favourites</p>
          )}

          <RouteMap result={result} from={from.latLng} to={to.latLng} />

          {result.gatesOnRoute.length === 0 ? (
            <div className="bg-white rounded-xl shadow px-4 py-6 text-center text-gray-400 text-sm">
              No railway gates found on this route.
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Gates on your route ({result.gatesOnRoute.length})
              </h2>
              {result.gatesOnRoute.map(({ gate, distanceFromOriginKm, prediction }) => (
                <GateCard
                  key={gate.id}
                  gate={gate}
                  distanceFromOriginKm={distanceFromOriginKm}
                  prediction={prediction}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

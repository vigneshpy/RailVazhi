"use client";

import { format } from "date-fns";
import type { Recommendation } from "@railvazhi/shared";

type Props = { recommendation: Recommendation };

export function RecommendationBanner({ recommendation }: Props) {
  const { leaveBy, waitUntil, reason } = recommendation;

  if (leaveBy) {
    return (
      <div className="bg-green-600 text-white rounded-xl px-4 py-3 shadow">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Leave by</p>
        <p className="text-2xl font-bold">{format(new Date(leaveBy), "h:mm a")}</p>
        <p className="text-sm mt-0.5 opacity-90">{reason}</p>
      </div>
    );
  }

  if (waitUntil) {
    return (
      <div className="bg-rail-red text-white rounded-xl px-4 py-3 shadow">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Wait until</p>
        <p className="text-2xl font-bold">{format(new Date(waitUntil), "h:mm a")}</p>
        <p className="text-sm mt-0.5 opacity-90">{reason}</p>
      </div>
    );
  }

  return (
    <div className="bg-rail-green text-white rounded-xl px-4 py-3 shadow">
      <p className="text-lg font-bold">All clear</p>
      <p className="text-sm opacity-90">{reason}</p>
    </div>
  );
}

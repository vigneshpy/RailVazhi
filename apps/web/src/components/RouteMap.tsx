"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { PredictionResponse } from "@railvazhi/shared";

// Leaflet icon fix for webpack/Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)["_getIconUrl"];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLOR: Record<string, string> = {
  OPEN: "#16a34a",
  CLOSING_SOON: "#f59e0b",
  CLOSED: "#dc2626",
};

function gateIcon(status: string) {
  const color = STATUS_COLOR[status] ?? "#6b7280";
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconAnchor: [8, 8],
  });
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length) map.fitBounds(L.latLngBounds(coords), { padding: [32, 32] });
  }, [coords, map]);
  return null;
}

type Props = {
  result: PredictionResponse;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
};

export function RouteMap({ result, from, to }: Props) {
  // GeoJSON coords are [lng, lat]; Leaflet wants [lat, lng]
  const polylineCoords: [number, number][] = result.route.polyline.coordinates.map(
    ([lng, lat]) => [lat, lng]
  );

  return (
    <MapContainer
      center={[from.lat, from.lng]}
      zoom={12}
      className="w-full rounded-xl overflow-hidden shadow"
      style={{ height: "280px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      />
      <FitBounds coords={polylineCoords} />

      <Polyline positions={polylineCoords} color="#1e3a8a" weight={4} opacity={0.8} />

      {/* Origin pin */}
      <Marker position={[from.lat, from.lng]}>
        <Popup>Start</Popup>
      </Marker>

      {/* Destination pin */}
      <Marker position={[to.lat, to.lng]}>
        <Popup>Destination</Popup>
      </Marker>

      {/* Gate markers */}
      {result.gatesOnRoute.map(({ gate, prediction }) => (
        <Marker
          key={gate.id}
          position={[gate.location.lat, gate.location.lng]}
          icon={gateIcon(prediction.currentStatus)}
        >
          <Popup>
            <strong>{gate.name}</strong>
            <br />
            Status: {prediction.currentStatus}
            {prediction.closureWindows[0] && (
              <>
                <br />
                Next closure: {new Date(prediction.closureWindows[0].start).toLocaleTimeString("en-IN")}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

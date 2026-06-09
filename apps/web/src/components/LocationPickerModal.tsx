"use client";

import { useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@railvazhi/shared";

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)["_getIconUrl"];
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  label: string;           // "From" or "To"
  initial?: LatLng;
  onConfirm: (loc: LatLng, name: string) => void;
  onClose: () => void;
};

function MapClickHandler({ onTap }: { onTap: (loc: LatLng) => void }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export function LocationPickerModal({ label, initial, onConfirm, onClose }: Props) {
  const [pin, setPin]               = useState<LatLng | null>(initial ?? null);
  const [pinName, setPinName]       = useState("");
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<NominatimResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [locating, setLocating]     = useState(false);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default map center: Sivakasi area
  const center: [number, number] = initial
    ? [initial.lat, initial.lng]
    : [9.4533, 77.7989];

  async function searchNominatim(q: string) {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in&viewbox=77.5,9.0,78.5,10.2&bounded=0`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json() as NominatimResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchNominatim(val), 400);
  }

  function selectResult(r: NominatimResult) {
    const loc = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    setPin(loc);
    setPinName(r.display_name.split(",")[0]);
    setQuery(r.display_name.split(",")[0]);
    setResults([]);
  }

  async function handleMapTap(loc: LatLng) {
    setPin(loc);
    // Show coords immediately while reverse geocode loads
    const coords = `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
    setPinName(coords);
    setQuery(coords);
    setResults([]);

    // Reverse geocode to get a human-readable name
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json() as { display_name?: string; address?: { road?: string; suburb?: string; town?: string; city?: string; village?: string } };
      const addr = data.address;
      const name =
        addr?.road ??
        addr?.suburb ??
        addr?.village ??
        addr?.town ??
        addr?.city ??
        data.display_name?.split(",")[0] ??
        coords;
      setPinName(name);
      setQuery(name);
    } catch {
      // keep coords as fallback
    }
  }

  function useGps() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(loc);
        setQuery("My location");
        setPinName("My location");
        setResults([]);
        setLocating(false);
        // Reverse geocode GPS position too
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`;
          const res = await fetch(url, { headers: { "Accept-Language": "en" } });
          const data = await res.json() as { address?: { road?: string; suburb?: string; town?: string; city?: string; village?: string }; display_name?: string };
          const addr = data.address;
          const name =
            addr?.road ??
            addr?.suburb ??
            addr?.village ??
            addr?.town ??
            addr?.city ??
            data.display_name?.split(",")[0] ??
            "My location";
          setPinName(name);
          setQuery(name);
        } catch {
          // keep "My location" as fallback
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }

  function confirm() {
    if (!pin) return;
    onConfirm(pin, pinName || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-rail-blue text-white shadow">
        <button onClick={onClose} className="text-white text-xl leading-none p-1">
          &#8592;
        </button>
        <span className="font-semibold text-base">Pick {label}</span>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b bg-white space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={handleSearchInput}
            placeholder={`Search place or tap map...`}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rail-blue"
            autoFocus
          />
          <button
            type="button"
            onClick={useGps}
            disabled={locating}
            className="bg-rail-blue text-white text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {locating ? "..." : "GPS"}
          </button>
        </div>

        {/* Search results */}
        {results.length > 0 && (
          <ul className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-40 overflow-y-auto">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-700"
                  onClick={() => selectResult(r)}
                >
                  <span className="font-medium">{r.display_name.split(",")[0]}</span>
                  <span className="text-gray-400 text-xs block truncate">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searching && <p className="text-xs text-gray-400 px-1">Searching...</p>}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={13}
          className="w-full h-full"
          style={{ minHeight: 0 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapClickHandler onTap={handleMapTap} />
          {pin && <Marker position={[pin.lat, pin.lng]} />}
        </MapContainer>

        {/* Hint overlay */}
        {!pin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Tap the map to place a pin
          </div>
        )}
      </div>

      {/* Confirm bar */}
      <div className="px-4 py-3 border-t bg-white">
        {pin && (
          <p className="text-xs text-gray-500 mb-2 truncate">
            Selected: <span className="font-medium text-gray-700">{pinName}</span>
          </p>
        )}
        <button
          type="button"
          onClick={confirm}
          disabled={!pin}
          className="w-full bg-rail-blue text-white font-semibold py-2.5 rounded-lg disabled:opacity-40"
        >
          Confirm {label}
        </button>
      </div>
    </div>
  );
}

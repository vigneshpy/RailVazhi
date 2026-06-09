"use client";

import { useState } from "react";
import type { Favourite } from "../hooks/useFavourites";
import type { LatLng } from "@railvazhi/shared";

type Props = {
  favourites: Favourite[];
  onSelect: (from: { latLng: LatLng; name: string }, to: { latLng: LatLng; name: string }) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
};

export function FavouritesBar({ favourites, onSelect, onRemove, onRename }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!favourites.length) return null;

  function startRename(fav: Favourite) {
    setRenamingId(fav.id);
    setRenameValue(fav.label);
  }

  function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) onRename(id, trimmed);
    setRenamingId(null);
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Favourites
      </p>
      <div className="flex flex-col gap-2">
        {favourites.map((fav) => (
          <div
            key={fav.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2.5 flex items-center gap-2"
          >
            {/* Star icon */}
            <span className="text-rail-amber shrink-0">&#9733;</span>

            {/* Label / rename input */}
            <div className="flex-1 min-w-0">
              {renamingId === fav.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(fav.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(fav.id); if (e.key === "Escape") setRenamingId(null); }}
                  className="w-full text-sm border border-rail-blue rounded px-2 py-0.5 focus:outline-none"
                />
              ) : (
                <button
                  type="button"
                  className="text-left w-full"
                  onClick={() => onSelect(fav.from, fav.to)}
                >
                  <p className="text-sm font-medium text-gray-800 truncate">{fav.label}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {fav.from.name} &rarr; {fav.to.name}
                  </p>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                title="Rename"
                onClick={() => startRename(fav)}
                className="text-gray-300 hover:text-gray-500 text-base px-1"
              >
                &#9998;
              </button>
              <button
                type="button"
                title="Remove"
                onClick={() => onRemove(fav.id)}
                className="text-gray-300 hover:text-rail-red text-lg px-1 leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { LatLng } from "@railvazhi/shared";

export type Favourite = {
  id: string;
  label: string;         // user-facing name e.g. "Home to Work"
  from: { latLng: LatLng; name: string };
  to:   { latLng: LatLng; name: string };
};

const STORAGE_KEY = "railvazhi:favourites";

function load(): Favourite[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Favourite[];
  } catch {
    return [];
  }
}

function save(favs: Favourite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Favourite[]>([]);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    setFavourites(load());
  }, []);

  function add(fav: Omit<Favourite, "id">) {
    const newFav: Favourite = { ...fav, id: `${Date.now()}` };
    const updated = [newFav, ...favourites];
    save(updated);
    setFavourites(updated);
    return newFav;
  }

  function remove(id: string) {
    const updated = favourites.filter((f) => f.id !== id);
    save(updated);
    setFavourites(updated);
  }

  function rename(id: string, label: string) {
    const updated = favourites.map((f) => (f.id === id ? { ...f, label } : f));
    save(updated);
    setFavourites(updated);
  }

  return { favourites, add, remove, rename };
}

import { useEffect, useRef, useState } from "react";
import type { Listing } from "../types/inertia";

const STORAGE_KEY = "mc-pile";

function storageKey(storeSlug?: string): string {
  return storeSlug ? `${STORAGE_KEY}-${storeSlug}` : STORAGE_KEY;
}

function loadStoredPile(key: string): Listing[] {
  if (typeof window === "undefined") {return [];}

  try {
    const storedPile = localStorage.getItem(key);
    if (storedPile) {return JSON.parse(storedPile);}
    return [];
  } catch {
    return [];
  }
}

function applyAddToPile(setPile: React.Dispatch<React.SetStateAction<Listing[]>>, listing: Listing) {
  setPile((current) =>
    current.some((s) => s.id === listing.id) ? current : [...current, listing],
  );
}

function applyRemoveFromPile(setPile: React.Dispatch<React.SetStateAction<Listing[]>>, id: number) {
  setPile((current) => current.filter((l) => l.id !== id));
}

export function usePile(storeSlug?: string) {
  const currentKey = storageKey(storeSlug);
  const initialKey = useRef(currentKey).current;
  const [pile, setPile] = useState<Listing[]>(() => loadStoredPile(currentKey));

  useEffect(() => {
    if (currentKey !== initialKey) {
      setPile(loadStoredPile(currentKey));
    }
  }, [currentKey, initialKey]);

  useEffect(() => {
    localStorage.setItem(currentKey, JSON.stringify(pile));
  }, [pile, currentKey]);

  const addToPile = (listing: Listing) => applyAddToPile(setPile, listing);
  const removeFromPile = (id: number) => applyRemoveFromPile(setPile, id);
  const inPile = (id: number) => pile.some((l) => l.id === id);
  const clearPile = () => setPile([]);

  return { pile, addToPile, removeFromPile, inPile, clearPile };
}

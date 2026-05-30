import { useEffect, useRef, useState } from "react";
import type { Listing } from "../types/inertia";

const STORAGE_KEY = "mc-pile";

function storageKey(storeSlug?: string): string {
  return storeSlug ? `${STORAGE_KEY}-${storeSlug}` : STORAGE_KEY;
}

function loadStoredPile(key: string): Listing[] {
  if (typeof window === "undefined") return [];

  try {
    const storedPile = localStorage.getItem(key);
    if (storedPile) return JSON.parse(storedPile);
    return [];
  } catch {
    return [];
  }
}

export function usePile(storeSlug?: string) {
  const currentKey = storageKey(storeSlug);
  const initialKey = useRef(currentKey).current;

  const [pile, setPile] = useState<Listing[]>(() => loadStoredPile(currentKey));

  // Re-initialize when store changes (navigate to a different store)
  // Skip initial mount — useState lazy init already handles that
  useEffect(() => {
    if (currentKey !== initialKey) {
      setPile(loadStoredPile(currentKey));
    }
  }, [currentKey, initialKey]);

  useEffect(() => {
    localStorage.setItem(currentKey, JSON.stringify(pile));
  }, [pile, currentKey]);

  const addToPile = (listing: Listing) =>
    setPile((currentPile) =>
      currentPile.some((savedListing) => savedListing.id === listing.id)
        ? currentPile
        : [...currentPile, listing],
    );

  const removeFromPile = (id: number) =>
    setPile((currentPile) => currentPile.filter((listing) => listing.id !== id));

  const inPile = (id: number) => pile.some((listing) => listing.id === id);

  const clearPile = () => setPile([]);

  return { pile, addToPile, removeFromPile, inPile, clearPile };
}

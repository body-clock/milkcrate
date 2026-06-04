import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { usePile } from "../hooks/use_pile";
import type { Listing } from "../types/inertia";

interface PileContextValue {
  pile: Listing[];
  addToPile: (listing: Listing) => void;
  removeFromPile: (id: number) => void;
  inPile: (id: number) => boolean;
  clearPile: () => void;
  /** The most recently added listing, or null. Cleared after the toast dismisses. */
  lastAdded: Listing | null;
  clearLastAdded: () => void;
}

const PileContext = createContext<PileContextValue | null>(null);

function usePileProviderValue(storeSlug?: string) {
  const { addToPile: anp, pile, removeFromPile, inPile, clearPile: pcp } = usePile(storeSlug);
  const [lastAdded, setLastAdded] = useState<Listing | null>(null);
  const addToPile = useCallback(
    (listing: Listing) => { anp(listing); setLastAdded(listing); },
    [anp],
  );
  const clearLastAdded = useCallback(() => setLastAdded(null), []);
  return useMemo<PileContextValue>(
    () => ({ pile, removeFromPile, inPile, clearPile: pcp,
      addToPile, lastAdded, clearLastAdded }),
    [pile, removeFromPile, inPile, pcp, addToPile, lastAdded, clearLastAdded],
  );
}

export function PileProvider({
  children, storeSlug,
}: { children: React.ReactNode; storeSlug?: string }) {
  const value = usePileProviderValue(storeSlug);
  return <PileContext.Provider value={value}>{children}</PileContext.Provider>;
}

export function usePileContext() {
  const ctx = useContext(PileContext);
  if (!ctx) {
    throw new Error("usePileContext must be used within PileProvider");
  }
  return ctx;
}

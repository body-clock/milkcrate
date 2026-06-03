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

export function PileProvider({
  children,
  storeSlug,
}: {
  children: React.ReactNode;
  storeSlug?: string;
}) {
  const pileState = usePile(storeSlug);
  const { addToPile: addOrRemovePile } = pileState;
  const [lastAdded, setLastAdded] = useState<Listing | null>(null);
  const addToPile = useCallback((listing: Listing) => { addOrRemovePile(listing); setLastAdded(listing); }, [addOrRemovePile]);
  const clearLastAdded = useCallback(() => setLastAdded(null), []);
  const value = useMemo(() => ({ ...pileState, addToPile, lastAdded, clearLastAdded }), [pileState, lastAdded, addToPile, clearLastAdded]);
  return <PileContext.Provider value={value}>{children}</PileContext.Provider>;
}

export function usePileContext() {
  const ctx = useContext(PileContext);
  if (!ctx) { throw new Error("usePileContext must be used within PileProvider"); }
  return ctx;
}

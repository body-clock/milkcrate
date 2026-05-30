import React, { createContext, useContext } from "react";
import { usePile } from "../hooks/use_pile";
import type { Listing } from "../types/inertia";

interface PileContextValue {
  pile: Listing[];
  addToPile: (listing: Listing) => void;
  removeFromPile: (id: number) => void;
  inPile: (id: number) => boolean;
  clearPile: () => void;
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
  return <PileContext.Provider value={pileState}>{children}</PileContext.Provider>;
}

export function usePileContext() {
  const pileContext = useContext(PileContext);
  if (!pileContext) throw new Error("usePileContext must be used within PileProvider");
  return pileContext;
}

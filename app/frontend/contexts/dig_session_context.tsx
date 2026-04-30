import React, { createContext, useContext } from "react"
import { useDigSession } from "../hooks/use_dig_session"
import type { Listing } from "../types/inertia"

interface DigSessionContextValue {
  pile: Listing[]
  addToPile: (listing: Listing) => void
  removeFromPile: (id: number) => void
  inPile: (id: number) => boolean
  clearPile: () => void
}

const DigSessionContext = createContext<DigSessionContextValue | null>(null)

export function DigSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useDigSession()
  return <DigSessionContext.Provider value={session}>{children}</DigSessionContext.Provider>
}

export function useDigSessionContext() {
  const ctx = useContext(DigSessionContext)
  if (!ctx) throw new Error("useDigSessionContext must be used within DigSessionProvider")
  return ctx
}

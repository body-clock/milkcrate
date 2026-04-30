import { useState, useEffect } from "react"
import type { Listing } from "../types/inertia"

const STORAGE_KEY = "mc-dig-session"

export function useDigSession() {
  const [pile, setPile] = useState<Listing[]>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pile))
  }, [pile])

  const addToPile = (listing: Listing) =>
    setPile((p) => p.some((l) => l.id === listing.id) ? p : [...p, listing])

  const removeFromPile = (id: number) =>
    setPile((p) => p.filter((l) => l.id !== id))

  const inPile = (id: number) => pile.some((l) => l.id === id)

  const clearPile = () => setPile([])

  return { pile, addToPile, removeFromPile, inPile, clearPile }
}

import { useEffect, useState } from "react"
import type { Listing } from "../types/inertia"

const STORAGE_KEY = "mc-pile"

function loadStoredPile() {
  if (typeof window === "undefined") return []

  try {
    const storedPile = localStorage.getItem(STORAGE_KEY)
    if (storedPile) return JSON.parse(storedPile)
    return []
  } catch {
    return []
  }
}

export function usePile() {
  const [pile, setPile] = useState<Listing[]>(loadStoredPile)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pile))
  }, [pile])

  const addToPile = (listing: Listing) =>
    setPile((currentPile) => currentPile.some((savedListing) => savedListing.id === listing.id) ? currentPile : [...currentPile, listing])

  const removeFromPile = (id: number) =>
    setPile((currentPile) => currentPile.filter((listing) => listing.id !== id))

  const inPile = (id: number) => pile.some((listing) => listing.id === id)

  const clearPile = () => setPile([])

  return { pile, addToPile, removeFromPile, inPile, clearPile }
}

import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDigSession } from "./use_dig_session"
import type { Listing } from "../types/inertia"

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Title",
  label: "Label",
  year: 1975,
  format: "Vinyl",
  genres: ["Jazz"],
  styles: ["Bebop"],
  condition: "VG+",
  price: "12.50",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
})

beforeEach(() => {
  localStorage.clear()
})

describe("useDigSession", () => {
  it("starts with an empty pile", () => {
    const { result } = renderHook(() => useDigSession())
    expect(result.current.pile).toEqual([])
  })

  it("adds a listing to the pile", () => {
    const { result } = renderHook(() => useDigSession())
    const listing = makeListing()

    act(() => result.current.addToPile(listing))

    expect(result.current.pile).toHaveLength(1)
    expect(result.current.pile[0].id).toBe(1)
  })

  it("does not add duplicates", () => {
    const { result } = renderHook(() => useDigSession())
    const listing = makeListing()

    act(() => {
      result.current.addToPile(listing)
      result.current.addToPile(listing)
    })

    expect(result.current.pile).toHaveLength(1)
  })

  it("removes a listing by id", () => {
    const { result } = renderHook(() => useDigSession())

    act(() => result.current.addToPile(makeListing({ id: 1 })))
    act(() => result.current.addToPile(makeListing({ id: 2 })))
    act(() => result.current.removeFromPile(1))

    expect(result.current.pile.map((l) => l.id)).toEqual([2])
  })

  it("clears all listings", () => {
    const { result } = renderHook(() => useDigSession())

    act(() => result.current.addToPile(makeListing({ id: 1 })))
    act(() => result.current.addToPile(makeListing({ id: 2 })))
    act(() => result.current.clearPile())

    expect(result.current.pile).toEqual([])
  })

  it("inPile returns true for added listing", () => {
    const { result } = renderHook(() => useDigSession())

    act(() => result.current.addToPile(makeListing({ id: 42 })))

    expect(result.current.inPile(42)).toBe(true)
    expect(result.current.inPile(99)).toBe(false)
  })

  it("persists pile to localStorage", () => {
    const { result } = renderHook(() => useDigSession())

    act(() => result.current.addToPile(makeListing({ id: 7 })))

    const stored = JSON.parse(localStorage.getItem("mc-dig-session") ?? "[]")
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(7)
  })

  it("restores pile from localStorage on mount", () => {
    const listing = makeListing({ id: 5 })
    localStorage.setItem("mc-dig-session", JSON.stringify([listing]))

    const { result } = renderHook(() => useDigSession())

    expect(result.current.pile).toHaveLength(1)
    expect(result.current.pile[0].id).toBe(5)
  })
})

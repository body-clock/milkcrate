import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import React from "react"
import { DigSessionProvider, useDigSessionContext } from "./dig_session_context"
import type { Listing } from "../types/inertia"

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Title",
  label: null,
  year: null,
  format: null,
  genres: [],
  styles: [],
  condition: null,
  price: "10.00",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
})

function PileConsumer() {
  const { pile, addToPile, removeFromPile, inPile, clearPile } = useDigSessionContext()
  const listing = makeListing({ id: 99 })

  return (
    <div>
      <span data-testid="count">{pile.length}</span>
      <span data-testid="in-pile">{inPile(99) ? "yes" : "no"}</span>
      <button onClick={() => addToPile(listing)}>add</button>
      <button onClick={() => removeFromPile(99)}>remove</button>
      <button onClick={() => clearPile()}>clear</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe("DigSessionContext", () => {
  it("provides an empty pile by default", () => {
    render(<DigSessionProvider><PileConsumer /></DigSessionProvider>)
    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("addToPile updates the pile count", () => {
    render(<DigSessionProvider><PileConsumer /></DigSessionProvider>)
    fireEvent.click(screen.getByText("add"))
    expect(screen.getByTestId("count").textContent).toBe("1")
  })

  it("inPile reflects current pile state", () => {
    render(<DigSessionProvider><PileConsumer /></DigSessionProvider>)
    expect(screen.getByTestId("in-pile").textContent).toBe("no")
    fireEvent.click(screen.getByText("add"))
    expect(screen.getByTestId("in-pile").textContent).toBe("yes")
  })

  it("removeFromPile removes the correct listing", () => {
    render(<DigSessionProvider><PileConsumer /></DigSessionProvider>)
    fireEvent.click(screen.getByText("add"))
    fireEvent.click(screen.getByText("remove"))
    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("clearPile empties the pile", () => {
    render(<DigSessionProvider><PileConsumer /></DigSessionProvider>)
    fireEvent.click(screen.getByText("add"))
    fireEvent.click(screen.getByText("clear"))
    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<PileConsumer />)).toThrow()
    spy.mockRestore()
  })
})

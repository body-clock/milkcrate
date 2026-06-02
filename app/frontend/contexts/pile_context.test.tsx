import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { PileProvider, usePileContext } from "./pile_context";
import type { Listing } from "../types/inertia";

const TEST_LISTING_ID = 99;

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: TEST_LISTING_ID,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Title",
  genres: [],
  styles: [],
  price: "10.00",
  currency: "USD",
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
});

function PileConsumer() {
  const { pile, addToPile, removeFromPile, inPile, clearPile } = usePileContext();
  const listing = makeListing();
  return (
    <div>
      <span data-testid="count">{pile.length}</span>
      <span data-testid="in-pile">{inPile(TEST_LISTING_ID) ? "yes" : "no"}</span>
      <button onClick={() => addToPile(listing)}>add</button>
      <button onClick={() => removeFromPile(TEST_LISTING_ID)}>remove</button>
      <button onClick={() => clearPile()}>clear</button>
    </div>
  );
}

beforeEach(() => { localStorage.clear() })

describe("PileContext — basic state", () => {
  it("provides an empty pile by default", () => {
    render(<PileProvider><PileConsumer /></PileProvider>)
    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("addToPile updates the pile count", () => {
    render(<PileProvider><PileConsumer /></PileProvider>)
    fireEvent.click(screen.getByText("add"))
    expect(screen.getByTestId("count").textContent).toBe("1")
  })

  it("inPile reflects current pile state", () => {
    render(<PileProvider><PileConsumer /></PileProvider>)
    expect(screen.getByTestId("in-pile").textContent).toBe("no")
    fireEvent.click(screen.getByText("add"))
    expect(screen.getByTestId("in-pile").textContent).toBe("yes")
  })
})

describe("PileContext — mutations", () => {
  it("removeFromPile removes the correct listing", () => {
    render(<PileProvider><PileConsumer /></PileProvider>)
    fireEvent.click(screen.getByText("add"))
    fireEvent.click(screen.getByText("remove"))
    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("clearPile empties the pile", () => {
    render(<PileProvider><PileConsumer /></PileProvider>)
    fireEvent.click(screen.getByText("add"))
    fireEvent.click(screen.getByText("clear"))
    expect(screen.getByTestId("count").textContent).toBe("0")
  })

  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<PileConsumer />)).toThrow("usePileContext must be used within PileProvider")
    spy.mockRestore()
  })
})

describe("PileContext — store scoping", () => {
  it("scopes pile per store", () => {
    render(<PileProvider storeSlug="store-a"><PileConsumer /></PileProvider>)
    fireEvent.click(screen.getByText("add"))
    expect(screen.getByTestId("count").textContent).toBe("1")
    render(<PileProvider storeSlug="store-b"><PileConsumer /></PileProvider>)
    expect(screen.getAllByTestId("count")[1].textContent).toBe("0")
  })

  it("persists pile per store in localStorage", () => {
    render(<PileProvider storeSlug="store-a"><PileConsumer /></PileProvider>)
    fireEvent.click(screen.getByText("add"))
    expect(localStorage.getItem("mc-pile-store-a")).toBe(JSON.stringify([makeListing()]))
    expect(localStorage.getItem("mc-pile-store-b")).toBeNull()
  })

  it("uses global key when no storeSlug provided", () => {
    render(<PileProvider><PileConsumer /></PileProvider>)
    fireEvent.click(screen.getByText("add"))
    expect(localStorage.getItem("mc-pile")).not.toBeNull()
  })
})

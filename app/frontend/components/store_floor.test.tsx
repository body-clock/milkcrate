import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import StoreFloor from "./store_floor"
import { DigSessionProvider } from "../contexts/dig_session_context"
import type { Crate, Listing } from "../types/inertia"

vi.mock("@/hooks/use_is_desktop", () => ({
  useIsDesktop: () => true,
}))

const makeListing = (id: number, title: string): Listing => ({
  id,
  discogs_listing_id: String(id),
  artist: "Artist",
  title,
  label: null,
  year: null,
  format: "LP",
  genres: [],
  styles: [],
  condition: null,
  price: "10.00",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
})

describe("StoreFloor desktop bento", () => {
  it("orders genre crates by count descending on desktop", () => {
    const onSelectCrate = vi.fn()
    const crates: Crate[] = [
      { slug: "picks", name: "Milkcrate Picks", count: 1, records: [makeListing(100, "Pick")] },
      { slug: "jazz", name: "Jazz", count: 20, records: [makeListing(1, "J1")] },
      { slug: "rock", name: "Rock", count: 40, records: [makeListing(2, "R1")] },
      { slug: "soul", name: "Soul", count: 30, records: [makeListing(3, "S1")] },
    ]

    render(
      <DigSessionProvider>
        <StoreFloor crates={crates} onSelectCrate={onSelectCrate} />
      </DigSessionProvider>
    )

    const genreHeaderButtons = screen.getAllByRole("button", { name: /^Open (Rock|Soul|Jazz)$/ })
    expect(genreHeaderButtons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Open Rock",
      "Open Soul",
      "Open Jazz",
    ])
  })

  it("maps deduped card click back to full crate index", async () => {
    const onSelectCrate = vi.fn()

    const shared = makeListing(10, "Shared")
    const rockOnly = makeListing(11, "Rock Only")
    const soulOnly = makeListing(12, "Soul Only")

    const crates: Crate[] = [
      { slug: "picks", name: "Milkcrate Picks", count: 1, records: [shared] },
      { slug: "rock", name: "Rock", count: 2, records: [shared, rockOnly] },
      { slug: "soul", name: "Soul", count: 1, records: [soulOnly] },
    ]

    render(
      <DigSessionProvider>
        <StoreFloor crates={crates} onSelectCrate={onSelectCrate} />
      </DigSessionProvider>
    )

    await userEvent.click(screen.getByRole("button", { name: "Open Rock at Rock Only" }))

    expect(onSelectCrate).toHaveBeenCalledWith("rock", 1)
  })

  it("shows an empty state when crates exist but have no visible records", () => {
    const onSelectCrate = vi.fn()
    const crates: Crate[] = [
      { slug: "picks", name: "Milkcrate Picks", count: 0, records: [] },
      { slug: "jazz", name: "Jazz", count: 0, records: [] },
    ]

    render(
      <DigSessionProvider>
        <StoreFloor crates={crates} onSelectCrate={onSelectCrate} />
      </DigSessionProvider>
    )

    expect(screen.getByText("No records in crates yet.")).toBeInTheDocument()
  })
})

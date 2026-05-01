import React from "react"
import { describe, expect, it, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import StoreSection from "./store_section"
import RecordCard from "./record_card"
import PileSheet from "./pile_sheet"
import { DigSessionProvider } from "../contexts/dig_session_context"
import type { Crate, Listing } from "../types/inertia"

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

const renderWithSession = (ui: React.ReactElement) => (
  render(<DigSessionProvider>{ui}</DigSessionProvider>)
)

beforeEach(() => {
  localStorage.clear()
})

describe("interactive accessibility", () => {
  it("exposes store record thumbnails as named buttons", async () => {
    const onSelect = vi.fn()
    const crate: Crate = {
      slug: "jazz",
      name: "Jazz",
      count: 1,
      records: [makeListing({ title: "Blue Train" })],
    }

    render(<StoreSection crate={crate} onSelect={onSelect} />)

    await userEvent.click(screen.getByRole("button", { name: "Open Jazz at Blue Train" }))

    expect(onSelect).toHaveBeenCalledWith("jazz", 0)
  })

  it("flips a record card with the keyboard", async () => {
    renderWithSession(<RecordCard listing={makeListing({ title: "Keyboard Record" })} />)

    const card = screen.getByRole("button", { name: "Show details for Keyboard Record" })
    card.focus()
    await userEvent.keyboard("{Enter}")

    expect(screen.getByRole("button", { name: "Show cover for Keyboard Record" })).toHaveAttribute("aria-pressed", "true")
  })

  it("closes the pile sheet with Escape", async () => {
    const onClose = vi.fn()

    renderWithSession(<PileSheet open onClose={onClose} />)

    expect(screen.getByRole("dialog", { name: "Your pile" })).toBeInTheDocument()

    await userEvent.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledOnce()
  })
})

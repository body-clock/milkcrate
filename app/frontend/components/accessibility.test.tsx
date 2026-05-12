import React from "react"
import { describe, expect, it, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RecordCard from "./record_card"
import PileSheet from "./pile_sheet"
import { PileProvider } from "../contexts/pile_context"
import { ViewportProvider } from "../contexts/viewport_context"
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

const renderWithPile = (ui: React.ReactElement) => (
  render(<ViewportProvider><PileProvider>{ui}</PileProvider></ViewportProvider>)
)

beforeEach(() => {
  localStorage.clear()
})

describe("interactive accessibility", () => {
  it("flips a record card with the keyboard", async () => {
    renderWithPile(<RecordCard listing={makeListing({ title: "Keyboard Record" })} />)

    const card = screen.getByRole("button", { name: "Show details for Keyboard Record" })
    card.focus()
    await userEvent.keyboard("{Enter}")

    expect(screen.getByRole("button", { name: "Show cover for Keyboard Record" })).toHaveAttribute("aria-pressed", "true")
  })

  it("closes the pile sheet with Escape", async () => {
    const onClose = vi.fn()

    renderWithPile(<PileSheet open onClose={onClose} />)

    expect(screen.getByRole("dialog", { name: "Your pile" })).toBeInTheDocument()

    await userEvent.keyboard("{Escape}")

    expect(onClose).toHaveBeenCalledOnce()
  })
})

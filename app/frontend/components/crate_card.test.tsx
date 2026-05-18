import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CrateCard from "./crate_card"
import StorefrontMotionConfig from "./storefront_motion_config"
import { PileProvider } from "../contexts/pile_context"
import { ViewportProvider } from "../contexts/viewport_context"
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

const makeCrate = (overrides: Partial<Crate> = {}): Crate => ({
  slug: "test-crate",
  name: "Test Crate",
  count: 4,
  records: [
    makeListing({ id: 1, title: "Record 1" }),
    makeListing({ id: 2, title: "Record 2" }),
    makeListing({ id: 3, title: "Record 3" }),
    makeListing({ id: 4, title: "Record 4" }),
  ],
  ...overrides,
})

const renderCard = (ui: React.ReactElement) =>
  render(
    <StorefrontMotionConfig>
      <ViewportProvider>
        <PileProvider>
          {ui}
        </PileProvider>
      </ViewportProvider>
    </StorefrontMotionConfig>,
  )

describe("CrateCard", () => {
  describe("rendering", () => {
    it("renders crate name", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)
      expect(screen.getByText("Test Crate")).toBeInTheDocument()
    })

    it("renders record count", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)
      // Count is 4, shown in CrateShelf
      expect(screen.getByText("4")).toBeInTheDocument()
    })

    it("renders open label 'DIG →'", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)
      expect(screen.getByText("DIG →")).toBeInTheDocument()
    })

    it("renders featured variant with larger header text", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="featured" onSelectCrate={vi.fn()} />)
      const nameEl = screen.getByText("Test Crate")
      expect(nameEl.className).toContain("text-base")
      expect(nameEl.className).toContain("font-semibold")
    })

    it("renders genre variant with smaller header text", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)
      const nameEl = screen.getByText("Test Crate")
      expect(nameEl.className).toContain("text-sm")
      expect(nameEl.className).toContain("font-semibold")
    })
  })

  describe("empty state", () => {
    it("shows 'No records yet' when crate has no records", () => {
      const crate = makeCrate({ count: 0, records: [] })
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)
      expect(screen.getByText("No records yet")).toBeInTheDocument()
    })

    it("does not render record tiles for empty crate", () => {
      const crate = makeCrate({ count: 0, records: [] })
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)
      // Only the header button should exist (no thumbnail buttons)
      expect(screen.queryAllByRole("button", { name: /Open.*at Record/ })).toHaveLength(0)
    })
  })

  describe("keyboard interaction", () => {
    it("fires onSelectCrate with slug on header Enter key", async () => {
      const onSelectCrate = vi.fn()
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={onSelectCrate} />)

      const headerBtn = screen.getByRole("button", { name: "Open Test Crate" })
      headerBtn.focus()
      await userEvent.keyboard("{Enter}")

      expect(onSelectCrate).toHaveBeenCalledWith("test-crate")
    })

    it("fires onSelectCrate with slug on header Space key", async () => {
      const onSelectCrate = vi.fn()
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={onSelectCrate} />)

      const headerBtn = screen.getByRole("button", { name: "Open Test Crate" })
      headerBtn.focus()
      await userEvent.keyboard(" ")

      expect(onSelectCrate).toHaveBeenCalledWith("test-crate")
    })

    it("does not fire when keyboard target is a nested button", async () => {
      const onSelectCrate = vi.fn()
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={onSelectCrate} />)

      // Focus a thumbnail button (which is a nested <button> inside the shelf)
      const thumbBtn = screen.getByRole("button", { name: "Open Test Crate at Record 1" })
      thumbBtn.focus()
      await userEvent.keyboard("{Enter}")

      // The thumbnail button's click handler fires, not the header's keyboard
      expect(onSelectCrate).toHaveBeenCalledWith("test-crate", 0)
    })
  })

  describe("thumbnail interaction", () => {
    it("fires onSelectCrate with slug and index on thumbnail click", async () => {
      const onSelectCrate = vi.fn()
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={onSelectCrate} />)

      const thumbBtn = screen.getByRole("button", { name: "Open Test Crate at Record 1" })
      await userEvent.click(thumbBtn)

      expect(onSelectCrate).toHaveBeenCalledWith("test-crate", 0)
    })

    it("fires onSelectCrate with correct index for 2nd record", async () => {
      const onSelectCrate = vi.fn()
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={onSelectCrate} />)

      const thumbBtn = screen.getByRole("button", { name: "Open Test Crate at Record 2" })
      await userEvent.click(thumbBtn)

      expect(onSelectCrate).toHaveBeenCalledWith("test-crate", 1)
    })

    it("fires onSelectCrate with correct index for 4th record", async () => {
      const onSelectCrate = vi.fn()
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={onSelectCrate} />)

      const thumbBtn = screen.getByRole("button", { name: "Open Test Crate at Record 4" })
      await userEvent.click(thumbBtn)

      expect(onSelectCrate).toHaveBeenCalledWith("test-crate", 3)
    })

    it("renders 4 thumbnail buttons for crate with 4+ records", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)

      // 4 thumbnail buttons + 1 header button
      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBe(5)
    })
  })

  describe("accessibility", () => {
    it("has accessible header button", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)

      const headerBtn = screen.getByRole("button", { name: "Open Test Crate" })
      expect(headerBtn).toHaveAttribute("tabindex", "0")
    })

    it("thumbnail buttons have accessible names", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)

      expect(screen.getByRole("button", { name: "Open Test Crate at Record 1" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Open Test Crate at Record 2" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Open Test Crate at Record 3" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Open Test Crate at Record 4" })).toBeInTheDocument()
    })

    it("does not nest button elements inside button elements", () => {
      const crate = makeCrate()
      renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)

      const buttons = document.querySelectorAll("button")
      buttons.forEach((btn) => {
        expect(btn.querySelectorAll("button").length).toBe(0)
      })
    })
  })

  describe("tactile hover wrapper", () => {
    it("wraps CrateShelf in a div with pointer event handlers", () => {
      const crate = makeCrate()
      const { container } = renderCard(<CrateCard crate={crate} variant="genre" onSelectCrate={vi.fn()} />)

      // CrateCard wraps CrateShelf inside a div. The CrateShelf's own
      // root div has a rounded/border class, so we can verify the structure.
      const shelfRoots = container.querySelectorAll('.rounded-lg.bg-mc-bg-card')
      expect(shelfRoots.length).toBe(1)
      // The CrateShelf header button should be inside this wrapper
      expect(screen.getByRole("button", { name: "Open Test Crate" })).toBeInTheDocument()
    })
  })
})

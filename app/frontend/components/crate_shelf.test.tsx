import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CrateShelf from "./crate_shelf"
import type { Crate, Listing } from "../types/inertia"

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Test Record",
  label: "Label",
  year: 2024,
  format: null,
  genres: ["Rock"],
  styles: [],
  condition: "VG+",
  price: "12.00",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
})

const makeCrate = (overrides: Partial<Crate> = {}): Crate => ({
  slug: "jazz-crate",
  name: "Jazz",
  count: 4,
  records: [
    makeListing({ id: 1, title: "Record 1" }),
    makeListing({ id: 2, title: "Record 2" }),
    makeListing({ id: 3, title: "Record 3" }),
    makeListing({ id: 4, title: "Record 4" }),
  ],
  ...overrides,
})

describe("CrateShelf", () => {
  describe("non-interactive mode (default)", () => {
    it("renders crate name", () => {
      const crate = makeCrate()

      render(<CrateShelf crate={crate} />)

      expect(screen.getByText("Jazz")).toBeInTheDocument()
    })

    it("renders record count", () => {
      const crate = makeCrate({ count: 4 })

      render(<CrateShelf crate={crate} />)

      expect(screen.getByText("4")).toBeInTheDocument()
    })

    it("renders RecordTile components for records", () => {
      const crate = makeCrate()

      render(<CrateShelf crate={crate} />)

      // Record titles from RecordTile alt text
      const imgs = document.querySelectorAll("img")
      // Fallback ♪ since no cover images, so no img elements
      // But we should see the fallback placeholders
      expect(document.querySelectorAll(".bg-mc-bg-raised").length).toBeGreaterThanOrEqual(1)
    })

    it("renders at most 4 record tiles", () => {
      const crate = makeCrate({
        records: Array.from({ length: 8 }, (_, i) =>
          makeListing({ id: i + 1, title: `Record ${i + 1}` })
        ),
      })

      render(<CrateShelf crate={crate} />)

      // Should only render 4 tiles max (2x2 grid)
      const fallbacks = document.querySelectorAll("img")
      // With no cover images, we get ♪ fallbacks
      const notes = screen.getAllByText("♪")
      expect(notes.length).toBeLessThanOrEqual(4)
    })

    it("header is not a button in non-interactive mode", () => {
      const crate = makeCrate()

      render(<CrateShelf crate={crate} />)

      // The crate name should be present but not as a button
      expect(screen.getByText("Jazz")).toBeInTheDocument()
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("does not fire onSelectCrate when header is clicked", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const crate = makeCrate()

      render(<CrateShelf crate={crate} onSelectCrate={onSelectCrate} />)

      // Click the crate name area
      await user.click(screen.getByText("Jazz"))

      expect(onSelectCrate).not.toHaveBeenCalled()
    })
  })

  describe("interactive mode", () => {
    it("renders header as a clickable element", () => {
      const crate = makeCrate()
      const onSelectCrate = vi.fn()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      const button = screen.getByRole("button", { name: "Open Jazz" })
      expect(button).toBeInTheDocument()
    })

    it("calls onSelectCrate with slug when header is clicked", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const crate = makeCrate()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      const button = screen.getByRole("button", { name: "Open Jazz" })
      await user.click(button)

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate")
      expect(onSelectCrate).toHaveBeenCalledTimes(1)
    })

    it("calls onSelectCrate with slug and index when a record thumbnail is clicked", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const crate = makeCrate()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      // Click the first record thumbnail — it's a button with aria-label
      const recordBtn = screen.getByRole("button", { name: "Open Jazz at Record 1" })
      await user.click(recordBtn)

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate", 0)
    })

    it("calls onSelectCrate with correct index for 2nd record", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const crate = makeCrate()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      const recordBtn = screen.getByRole("button", { name: "Open Jazz at Record 2" })
      await user.click(recordBtn)

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate", 1)
    })

    it("responds to Enter key on header", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const crate = makeCrate()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      const button = screen.getByRole("button", { name: "Open Jazz" })
      button.focus()
      await user.keyboard("{Enter}")

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate")
    })

    it("responds to Space key on header", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const crate = makeCrate()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      const button = screen.getByRole("button", { name: "Open Jazz" })
      button.focus()
      await user.keyboard(" ")

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate")
    })

    it("does not fire onSelectCrate when header is clicked if no handler", async () => {
      const user = userEvent.setup()
      const crate = makeCrate()

      render(<CrateShelf crate={crate} interactive />)

      // Should not throw — just clicking without a handler
      const button = screen.getByRole("button", { name: "Open Jazz" })
      await user.click(button)
      // No assertion needed — test passes if no error thrown
    })
  })

  describe("edge cases", () => {
    it("handles crate with 0 records", () => {
      const crate = makeCrate({ count: 0, records: [] })

      render(<CrateShelf crate={crate} />)

      expect(screen.getByText("Jazz")).toBeInTheDocument()
      // No records to render — should show empty state
      expect(screen.queryAllByText("♪").length).toBe(0)
    })

    it("handles crate with 1 record", () => {
      const crate = makeCrate({
        count: 1,
        records: [makeListing({ id: 1, title: "Solo" })],
      })

      render(<CrateShelf crate={crate} />)

      expect(screen.getByText("Jazz")).toBeInTheDocument()
    })

    it("applies className prop", () => {
      const crate = makeCrate()

      render(<CrateShelf crate={crate} className="test-shelf" />)

      const shelf = document.querySelector(".test-shelf")
      expect(shelf).toBeInTheDocument()
    })

    it("handles missing onSelectCrate gracefully in interactive mode", () => {
      const crate = makeCrate()

      // Should render without crashing
      render(<CrateShelf crate={crate} interactive />)

      const button = screen.getByRole("button", { name: "Open Jazz" })
      expect(button).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("interactive header has tabIndex 0", () => {
      const crate = makeCrate()
      const onSelectCrate = vi.fn()

      render(
        <CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />
      )

      const button = screen.getByRole("button", { name: "Open Jazz" })
      expect(button).toHaveAttribute("tabindex", "0")
    })

    it("non-interactive mode has no interactive elements", () => {
      const crate = makeCrate()

      render(<CrateShelf crate={crate} />)

      // No buttons, no tab-indexed elements
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })
  })
})

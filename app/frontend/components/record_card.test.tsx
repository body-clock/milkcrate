import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RecordCard from "./record_card"
import { PileProvider } from "@/contexts/pile_context"
import type { Listing } from "../types/inertia"

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

function renderCard(props: Partial<React.ComponentProps<typeof RecordCard>> = {}) {
  return render(
    <PileProvider>
      <RecordCard listing={makeListing()} {...props} />
    </PileProvider>,
  )
}

describe("RecordCard", () => {
  describe("happy path", () => {
    it("renders listing title in back face details", () => {
      renderCard({ listing: makeListing({ title: "Purple Rain" }) })

      expect(screen.getByText("Purple Rain")).toBeInTheDocument()
    })

    it("renders artist name", () => {
      renderCard({ listing: makeListing({ artist: "Prince" }) })

      expect(screen.getByText("Prince")).toBeInTheDocument()
    })

    it("renders cover image when cover_image_url exists", () => {
      const listing = makeListing({ cover_image_url: "https://example.com/cover.jpg" })

      renderCard({ listing })

      const img = screen.getByRole("img")
      expect(img).toHaveAttribute("src", "https://example.com/cover.jpg")
    })

    it("has tabIndex 0 when flip is enabled", () => {
      renderCard()

      const card = screen.getByRole("button", { name: /Show details for/ })
      expect(card).toHaveAttribute("tabindex", "0")
    })
  })

  describe("flip behavior", () => {
    it("flips on click", async () => {
      const user = userEvent.setup()
      const listing = makeListing({ title: "Flip Me" })

      renderCard({ listing })

      const card = screen.getByRole("button", { name: /Show details for/ })

      await user.click(card)

      expect(card).toHaveAttribute("aria-pressed", "true")
    })

    it("flips back on second click", async () => {
      const user = userEvent.setup()
      const listing = makeListing({ title: "Two Flips" })

      renderCard({ listing })

      const card = screen.getByRole("button", { name: /Show details for/ })

      await user.click(card)
      expect(card).toHaveAttribute("aria-pressed", "true")

      await user.click(card)
      expect(card).toHaveAttribute("aria-pressed", "false")
    })

    it("does not flip when disableFlip is true", () => {
      renderCard({ disableFlip: true })

      expect(screen.queryByRole("button", { name: /Show details for/ })).not.toBeInTheDocument()
      expect(screen.getByText("+ Pile")).toBeInTheDocument()
    })

    it("resets flip state on resetKey change", () => {
      const listing = makeListing({ title: "Reset Me" })
      const { rerender } = render(
        <PileProvider>
          <RecordCard listing={listing} resetKey="a" />
        </PileProvider>,
      )

      const card = screen.getByRole("button", { name: /Show details for/ })
      fireEvent.click(card)
      expect(card).toHaveAttribute("aria-pressed", "true")

      rerender(
        <PileProvider>
          <RecordCard listing={listing} resetKey="b" />
        </PileProvider>,
      )

      expect(card).toHaveAttribute("aria-pressed", "false")
    })
  })

  describe("pile integration", () => {
    it("renders pile add button", () => {
      renderCard()

      expect(screen.getByText("+ Pile")).toBeInTheDocument()
    })

    it("renders Discogs link", () => {
      renderCard()

      const link = screen.getByRole("link", { name: /Discogs/ })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "https://www.discogs.com/sell/item/1")
    })

    it("uses canonical action treatment for pile and external record actions", () => {
      renderCard()

      const pileButton = screen.getByRole("button", { name: "+ Pile" })
      const discogsLink = screen.getByRole("link", { name: /Discogs/ })
      expect(pileButton).toHaveClass("focus-visible:ring-mc-focus")
      expect(discogsLink).toHaveClass("focus-visible:ring-mc-focus")
      expect(pileButton).not.toHaveClass("mc-btn")
      expect(discogsLink).not.toHaveClass("mc-btn")
    })

    it("does not flip when pile button is clicked", async () => {
      const user = userEvent.setup()
      const listing = makeListing({ title: "No Flip on Pile" })

      renderCard({ listing })

      const card = screen.getByRole("button", { name: /Show details for/ })
      const pileBtn = screen.getByText("+ Pile")

      await user.click(pileBtn)

      expect(card).toHaveAttribute("aria-pressed", "false")
    })
  })

  describe("edge cases", () => {
    it("handles null title gracefully", () => {
      renderCard({ listing: makeListing({ title: null }) })

      expect(document.body).toBeInTheDocument()
    })

    it("handles null cover_image_url gracefully", () => {
      renderCard({ listing: makeListing({ cover_image_url: null }) })

      const tile = document.querySelector(".text-5xl")
      expect(tile).toBeInTheDocument()
    })

    it("applies className", () => {
      renderCard({ className: "test-record" })

      const el = document.querySelector(".test-record")
      expect(el).toBeInTheDocument()
    })
  })

  describe("accessibility", () => {
    it("flippable card announces current state in aria-label", () => {
      const listing = makeListing({ title: "A Night at the Opera" })

      renderCard({ listing })

      const card = screen.getByRole("button", { name: /Show details for/ })
      expect(card).toHaveAttribute("aria-label", "Show details for A Night at the Opera")
    })

    it("uses correct aria-pressed state", async () => {
      const user = userEvent.setup()

      renderCard({ listing: makeListing({ title: "Press Test" }) })

      const card = screen.getByRole("button", { name: /Show details for/ })

      expect(card).toHaveAttribute("aria-pressed", "false")

      await user.click(card)

      expect(card).toHaveAttribute("aria-pressed", "true")
    })
  })
})

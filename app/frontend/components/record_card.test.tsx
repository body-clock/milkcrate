import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RecordCard from "./record_card"
import StorefrontMotionConfig from "./storefront_motion_config"
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
    <StorefrontMotionConfig>
      <PileProvider>
        <RecordCard listing={makeListing()} {...props} />
      </PileProvider>
    </StorefrontMotionConfig>,
  )
}

describe("RecordCard", () => {
  describe("happy path", () => {
    it("renders listing title in back face details", () => {
      renderCard({ listing: makeListing({ title: "Purple Rain" }) })

      // The title appears in the back face
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

      // Before flip: "Show details for Flip Me" is the aria-label
      const card = screen.getByRole("button", { name: /Show details for/ })

      await user.click(card)

      // After flip: aria-pressed changes to true
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

    it("does not flip when disableFlip is true", async () => {
      const user = userEvent.setup()
      renderCard({ disableFlip: true })

      // The card itself should not have role="button" when flip is disabled
      expect(screen.queryByRole("button", { name: /Show details for/ })).not.toBeInTheDocument()
      // Pile buttons inside the card are still present
      expect(screen.getByText("+ Pile")).toBeInTheDocument()
    })

    it("resets flip state on resetKey change", () => {
      const listing = makeListing({ title: "Reset Me" })
      const { rerender } = render(
        <StorefrontMotionConfig>
          <PileProvider>
            <RecordCard listing={listing} resetKey="a" />
          </PileProvider>
        </StorefrontMotionConfig>,
      )

      const card = screen.getByRole("button", { name: /Show details for/ })
      fireEvent.click(card)
      expect(card).toHaveAttribute("aria-pressed", "true")

      // Rerender with new resetKey
      rerender(
        <StorefrontMotionConfig>
          <PileProvider>
            <RecordCard listing={listing} resetKey="b" />
          </PileProvider>
        </StorefrontMotionConfig>,
      )

      expect(card).toHaveAttribute("aria-pressed", "false")
    })
  })

  describe("parallax tilt", () => {
    it("adds pointer handlers when parallax is enabled", () => {
      renderCard({ disableParallax: false })

      // Perspective is applied via transformTemplate
      const card = document.querySelector("[style*='perspective']")
      expect(card).toBeInTheDocument()
    })

    it("supports disableParallax prop without crashing", () => {
      // Should render without error even with parallax disabled
      renderCard({ disableParallax: true })

      const card = screen.getByRole("button", { name: /Show details for/ })
      expect(card).toBeInTheDocument()
    })

    it("survives pointer events without crashing", () => {
      renderCard()

      const card = screen.getByRole("button", { name: /Show details for/ })

      // These should not throw
      fireEvent.pointerEnter(card)
      fireEvent.pointerMove(card)
      fireEvent.pointerLeave(card)
    })

    it("does not add tilt listeners when disableFlip is true (no card role=button)", () => {
      renderCard({ disableFlip: true })

      // The card itself should not have role="button"
      expect(screen.queryByRole("button", { name: /Show details for/ })).not.toBeInTheDocument()
      // However pile buttons inside the card are still present
      expect(screen.getByText("+ Pile")).toBeInTheDocument()
    })

    it("applies perspective to the card transform", () => {
      renderCard()

      const el = document.querySelector("[style*='perspective']")
      expect(el).toBeInTheDocument()
      // Perspective is applied via transformTemplate — look for it in the transform
      expect(el?.getAttribute("style")).toContain("perspective(800px)")
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

    it("does not flip when pile button is clicked", async () => {
      const user = userEvent.setup()
      const listing = makeListing({ title: "No Flip on Pile" })

      renderCard({ listing })

      const card = screen.getByRole("button", { name: /Show details for/ })
      const pileBtn = screen.getByText("+ Pile")

      await user.click(pileBtn)

      // Card state should not change
      expect(card).toHaveAttribute("aria-pressed", "false")
    })
  })

  describe("edge cases", () => {
    it("handles null title gracefully", () => {
      renderCard({ listing: makeListing({ title: null }) })

      // Should not throw — back face shows empty or fallback
      expect(document.body).toBeInTheDocument()
    })

    it("handles null cover_image_url gracefully", () => {
      renderCard({ listing: makeListing({ cover_image_url: null }) })

      // Fallback ♪ character
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

      // Initially not pressed
      expect(card).toHaveAttribute("aria-pressed", "false")

      await user.click(card)

      // After flip, pressed
      expect(card).toHaveAttribute("aria-pressed", "true")
    })
  })
})

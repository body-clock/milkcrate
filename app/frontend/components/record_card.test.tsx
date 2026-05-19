import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RecordCard from "./record_card"
import { PileProvider } from "../contexts/pile_context"
import { ViewportProvider } from "../contexts/viewport_context"
import type { Listing } from "../types/inertia"

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Title",
  label: "Label",
  year: 1975,
  format: "Vinyl",
  genres: ["Jazz", "Fusion"],
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

const renderWithPile = (ui: React.ReactElement) =>
  render(<ViewportProvider><PileProvider>{ui}</PileProvider></ViewportProvider>)

/** Helper: find the card div (role="button" element that wraps the motion div) */
const getCard = (name?: string) => {
  const all = screen.getAllByRole("button")
  // The card is the one with aria-label containing "Show details" or "Show cover"
  return all.find((el) => {
    const label = el.getAttribute("aria-label") || ""
    return label.includes("Show details") || label.includes("Show cover")
  })!
}

describe("RecordCard", () => {
  describe("flip mechanics", () => {
    it("clicking the card flips it from front to back", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Click Test" })} />)

      const card = screen.getByRole("button", { name: "Show details for Click Test" })
      expect(card).toHaveAttribute("aria-pressed", "false")
      await userEvent.click(card)
      expect(card).toHaveAttribute("aria-pressed", "true")
      expect(card).toHaveAttribute("aria-label", "Show cover for Click Test")
    })

    it("clicking again flips back to front", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Flip Back" })} />)

      const card = screen.getByRole("button", { name: "Show details for Flip Back" })
      await userEvent.click(card)
      expect(card).toHaveAttribute("aria-pressed", "true")
      await userEvent.click(card)
      expect(card).toHaveAttribute("aria-pressed", "false")
      expect(card).toHaveAttribute("aria-label", "Show details for Flip Back")
    })

    it("keyboard Enter flips the card", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Keyboard Test" })} />)

      const card = screen.getByRole("button", { name: "Show details for Keyboard Test" })
      card.focus()
      await userEvent.keyboard("{Enter}")
      expect(card).toHaveAttribute("aria-pressed", "true")
    })

    it("keyboard Space flips the card", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Space Test" })} />)

      const card = screen.getByRole("button", { name: "Show details for Space Test" })
      card.focus()
      await userEvent.keyboard(" ")
      expect(card).toHaveAttribute("aria-pressed", "true")
    })
  })

  describe("drag suppression", () => {
    it("does not flip after substantial pointer movement", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Drag Test" })} />)

      const card = screen.getByRole("button", { name: "Show details for Drag Test" })
      fireEvent.pointerDown(card, { clientX: 10, clientY: 10 })
      fireEvent.click(card, { clientX: 25, clientY: 25 })

      expect(card).toHaveAttribute("aria-pressed", "false")
    })

    it("still flips when movement is very small", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Tiny Move" })} />)

      const card = screen.getByRole("button", { name: "Show details for Tiny Move" })
      fireEvent.pointerDown(card, { clientX: 10, clientY: 10 })
      fireEvent.click(card, { clientX: 12, clientY: 14 })

      expect(card).toHaveAttribute("aria-pressed", "true")
    })
  })

  describe("disableFlip prop", () => {
    it("renders no role=button when disableFlip is true", () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "No Flip" })} disableFlip />)

      // The card should NOT have role="button", but poking around the DOM
      // there should be no accessible buttons for the card
      const cardName = screen.queryByRole("button", { name: "Show details for No Flip" })
      expect(cardName).toBeNull()
    })

    it("does not set aria-pressed when disableFlip is true", () => {
      renderWithPile(<RecordCard listing={makeListing()} disableFlip />)
      expect(screen.queryByRole("button", { name: /Show / })).toBeNull()
    })
  })

  describe("framed prop", () => {
    it("applies box-shadow when framed is true", () => {
      renderWithPile(<RecordCard listing={makeListing()} framed />)

      // The inner motion.div with rounded-lg gets box-shadow via style prop
      const motionDivs = document.querySelectorAll('[style*="box-shadow"]')
      expect(motionDivs.length).toBeGreaterThan(0)
    })

    it("does not apply box-shadow when framed is false", () => {
      renderWithPile(<RecordCard listing={makeListing()} framed={false} />)

      const motionDivs = document.querySelectorAll('[style*="box-shadow"]')
      expect(motionDivs.length).toBe(0)
    })
  })

  describe("resetKey unflip behavior", () => {
    it("resets flip state when resetKey changes", async () => {
      const { rerender } = renderWithPile(
        <RecordCard listing={makeListing({ title: "Reset Test" })} resetKey="a" />,
      )

      const card = screen.getByRole("button", { name: "Show details for Reset Test" })
      await userEvent.click(card)
      expect(card).toHaveAttribute("aria-pressed", "true")

      rerender(
        <ViewportProvider>
          <PileProvider>
            <RecordCard listing={makeListing({ title: "Reset Test" })} resetKey="b" />
          </PileProvider>
        </ViewportProvider>,
      )

      await waitFor(() => {
        expect(card).toHaveAttribute("aria-pressed", "false")
      })
    })
  })

  describe("back-face content", () => {
    it("shows title on the back face", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Back Face Album" })} />)

      const card = screen.getByRole("button", { name: "Show details for Back Face Album" })
      await userEvent.click(card)

      const titles = screen.getAllByText("Back Face Album")
      // Title appears both in aria-label and in back-face content
      expect(titles.length).toBeGreaterThanOrEqual(1)
    })

    it("shows back-face content is visible after flip", async () => {
      renderWithPile(
        <RecordCard listing={makeListing({ title: "Meta Record", artist: "Test Artist", label: "Blue Note", year: 1975, condition: "VG+" })} />,
      )

      const card = screen.getByRole("button", { name: "Show details for Meta Record" })
      await userEvent.click(card)

      // After flip, the back face content should be in the DOM
      expect(screen.getByText("Test Artist")).toBeInTheDocument()
      expect(screen.getByText("Blue Note · 1975 · VG+")).toBeInTheDocument()
    })

    it("slices genres to max 3 on the back face", async () => {
      renderWithPile(
        <RecordCard listing={makeListing({ genres: ["Jazz", "Fusion", "Bop", "Cool"] })} />,
      )

      const card = getCard()
      await userEvent.click(card)

      expect(screen.getByText("Jazz")).toBeInTheDocument()
      expect(screen.getByText("Fusion")).toBeInTheDocument()
      expect(screen.getByText("Bop")).toBeInTheDocument()
      expect(screen.queryByText("Cool")).toBeNull()
    })

    it("shows price using formatPrice on the back face", async () => {
      renderWithPile(
        <RecordCard listing={makeListing({ price: "15.99", currency: "USD" })} />,
      )

      const card = getCard()
      await userEvent.click(card)

      expect(screen.getByText("$15.99")).toBeInTheDocument()
    })

    it("shows — for missing price on the back face", async () => {
      renderWithPile(<RecordCard listing={makeListing({ price: "" })} />)

      const card = getCard()
      await userEvent.click(card)

      // "—" appears for price
      const dashes = screen.getAllByText("—")
      expect(dashes.length).toBeGreaterThan(0)
    })

    it("shows pile toggle buttons on the back face", async () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Pile Album" })} />)

      const card = screen.getByRole("button", { name: "Show details for Pile Album" })
      await userEvent.click(card)

      expect(screen.getByText("+ Pile")).toBeInTheDocument()
    })

    it("shows Discogs link on the back face", async () => {
      renderWithPile(
        <RecordCard listing={makeListing({ discogs_url: "https://www.discogs.com/sell/item/42" })} />,
      )

      const card = getCard()
      await userEvent.click(card)

      const link = screen.getByText("Discogs ↗")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })
  })

  describe("front-face content", () => {
    it("shows cover image when cover_image_url is present", () => {
      renderWithPile(
        <RecordCard listing={makeListing({ cover_image_url: "https://example.com/cover.jpg" })} />,
      )

      const img = document.querySelector('img[src="https://example.com/cover.jpg"]')
      expect(img).toBeInTheDocument()
    })

    it("shows ♪ placeholder when cover_image_url is null", () => {
      renderWithPile(<RecordCard listing={makeListing({ cover_image_url: null })} />)

      expect(screen.getByText("♪")).toBeInTheDocument()
    })
  })

  describe("nested interactive elements", () => {
    it("does not have nested buttons", () => {
      renderWithPile(<RecordCard listing={makeListing({ title: "Nest Check" })} />)

      const buttons = document.querySelectorAll("button")
      buttons.forEach((btn) => {
        expect(btn.querySelectorAll("button").length).toBe(0)
      })
    })
  })

  describe("pile integration", () => {
    it("adds record to pile via back-face button", async () => {
      renderWithPile(<RecordCard listing={makeListing({ id: 99, title: "Pile Add" })} />)

      const card = screen.getByRole("button", { name: "Show details for Pile Add" })
      await userEvent.click(card)

      const addButton = screen.getByText("+ Pile")
      await userEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText("✓ In pile")).toBeInTheDocument()
      })
    })

    it("removes record from pile via back-face button", async () => {
      renderWithPile(<RecordCard listing={makeListing({ id: 88, title: "Pile Remove" })} />)

      const card = screen.getByRole("button", { name: "Show details for Pile Remove" })
      await userEvent.click(card)

      const addButton = screen.getByText("+ Pile")
      await userEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText("✓ In pile")).toBeInTheDocument()
      })

      const removeButton = screen.getByText("✓ In pile")
      await userEvent.click(removeButton)

      await waitFor(() => {
        expect(screen.getByText("+ Pile")).toBeInTheDocument()
      })
    })
  })
})

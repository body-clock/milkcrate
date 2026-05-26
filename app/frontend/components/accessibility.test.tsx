import React from "react"
import { describe, expect, it, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RecordCard from "./record_card"
import CrateView from "./crate_view"
import CrateShelf from "./crate_shelf"
import PileSheet from "./pile_sheet"
import BrandMark from "./brand_mark"
import StorefrontMotionConfig from "./storefront_motion_config"
import MilkcrateShell from "../layouts/milkcrate_shell"
import { RIFFLE_LANGUAGE } from "@/lib/riffle_navigation"
import { PileProvider } from "../contexts/pile_context"
import { ViewportProvider } from "../contexts/viewport_context"
import type { Listing, Crate } from "../types/inertia"

// PileSheet now uses usePage for the store slug; provide a default mock
vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual("@inertiajs/react")
  return {
    ...actual,
    usePage: () => ({
      props: {
        store: { discogs_username: "test-store" },
        shopper: null,
      },
    }),
  }
})

// PileSheet uses useShopperContext; provide a default mock
vi.mock("../contexts/shopper_context", () => ({
  useShopperContext: () => ({
    shopper: null,
    isConnected: false,
    state: "idle",
    addToWantlist: vi.fn(),
    wantlistResult: null,
    errorMessage: null,
    resetResult: vi.fn(),
  }),
  ShopperProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

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
  render(<StorefrontMotionConfig><ViewportProvider><PileProvider>{ui}</PileProvider></ViewportProvider></StorefrontMotionConfig>)
)

function makeCrate(overrides: Partial<Crate> = {}): Crate {
  return {
    slug: "test-crate",
    name: "Test Crate",
    count: 4,
    records: [
      { id: 1, discogs_listing_id: "1", artist: "Artist 1", title: "Record 1", label: null, year: null, format: null, genres: [], styles: [], condition: null, price: "10.00", currency: "USD", cover_image_url: null, thumbnail_url: null, notes: null, discogs_url: "https://www.discogs.com/sell/item/1" },
      { id: 2, discogs_listing_id: "2", artist: "Artist 2", title: "Record 2", label: null, year: null, format: null, genres: [], styles: [], condition: null, price: "12.00", currency: "USD", cover_image_url: null, thumbnail_url: null, notes: null, discogs_url: "https://www.discogs.com/sell/item/2" },
      { id: 3, discogs_listing_id: "3", artist: "Artist 3", title: "Record 3", label: null, year: null, format: null, genres: [], styles: [], condition: null, price: "15.00", currency: "USD", cover_image_url: null, thumbnail_url: null, notes: null, discogs_url: "https://www.discogs.com/sell/item/3" },
      { id: 4, discogs_listing_id: "4", artist: "Artist 4", title: "Record 4", label: null, year: null, format: null, genres: [], styles: [], condition: null, price: "20.00", currency: "USD", cover_image_url: null, thumbnail_url: null, notes: null, discogs_url: "https://www.discogs.com/sell/item/4" },
    ],
    ...overrides,
  }
}

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

  it("exposes crate riffle controls and progress with front/deeper language", () => {
    render(
      <StorefrontMotionConfig>
        <ViewportProvider>
          <PileProvider>
            <CrateView
              crates={[makeCrate({ slug: "test-crate", name: "Test Crate" })]}
              activeSlug="test-crate"
              onSelectCrate={vi.fn()}
            />
          </PileProvider>
        </ViewportProvider>
      </StorefrontMotionConfig>,
    )

    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Record 1 of 4, front to deeper" })).toBeInTheDocument()
  })
})

describe("shell landmarks", () => {
  it("renders a main landmark with id=main-content and a skip-link targeting it", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Page content</div>
      </MilkcrateShell>
    )

    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "main-content")

    const skipLink = screen.getByText("Skip to content")
    expect(skipLink).toHaveAttribute("href", "#main-content")
  })

  it("renders exactly one main landmark", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Page content</div>
      </MilkcrateShell>
    )

    const mains = screen.getAllByRole("main")
    expect(mains).toHaveLength(1)
  })

  it("skip-link is sr-only until focused", () => {
    render(
      <MilkcrateShell header={<div>Header</div>}>
        <div>Page content</div>
      </MilkcrateShell>
    )

    const skipLink = screen.getByText("Skip to content")
    expect(skipLink.className).toContain("sr-only")
    expect(skipLink.className).toContain("focus:not-sr-only")
  })
})

describe("no nested interactive controls", () => {
  it("RecordCard does not nest button elements inside button elements", () => {
    renderWithPile(<RecordCard listing={makeListing({ title: "Nesting Test" })} />)

    // The outer interactive element should be a div with role="button", not a <button>
    // Check that no <button> element contains another <button> element.
    const buttons = document.querySelectorAll("button")
    buttons.forEach((btn) => {
      const nestedButtons = btn.querySelectorAll("button")
      expect(nestedButtons.length).toBe(0)
    })
  })

  it("keeps record actions keyboard-focusable through the canonical focus role", () => {
    renderWithPile(<RecordCard listing={makeListing({ title: "Focusable Actions" })} />)

    expect(screen.getByRole("button", { name: "+ Pile" })).toHaveClass("focus-visible:ring-mc-focus")
    expect(screen.getByRole("link", { name: /Discogs/ })).toHaveClass("focus-visible:ring-mc-focus")
  })

  it("CrateShelf interactive mode does not nest button elements inside button elements", () => {
    const crate = makeCrate()
    render(
      <StorefrontMotionConfig>
        <PileProvider>
          <ViewportProvider>
            <CrateShelf
              crate={crate}
              interactive={true}
              onSelectCrate={vi.fn()}
            />
          </ViewportProvider>
        </PileProvider>
      </StorefrontMotionConfig>,
    )

    // The header is a div with role="button"; thumbnails are <button>s.
    // No <button> should contain another <button>.
    const buttons = document.querySelectorAll("button")
    buttons.forEach((btn) => {
      const nestedButtons = btn.querySelectorAll("button")
      expect(nestedButtons.length).toBe(0)
    })
  })

  it("CrateShelf non-interactive mode renders no buttons", () => {
    const crate = makeCrate()
    render(
      <StorefrontMotionConfig>
        <CrateShelf
          crate={crate}
          interactive={false}
        />
      </StorefrontMotionConfig>,
    )

    // Non-interactive mode should not render any buttons.
    const buttons = document.querySelectorAll("button")
    expect(buttons.length).toBe(0)
  })

  it("RecordCard back-face buttons are direct children, not nested inside another button", () => {
    renderWithPile(<RecordCard listing={makeListing({ title: "Back Face Test" })} />)

    // The back face pile/add button should exist (after flip)
    // but verify there are no <button> elements inside other <button> elements.
    const buttons = document.querySelectorAll("button")
    for (const btn of buttons) {
      // Each button should not contain any other button
      const nested = btn.querySelectorAll("button")
      if (nested.length > 0) {
        // This would be a violation.
        // We're pre-checking the structure — actual flip test is in interactive section.
      }
    }
    // Structural: count buttons — should only be buttons, no nested ones.
    expect(buttons.length).toBeGreaterThanOrEqual(0)
    // Extra guard: no <button><button/></button> nesting.
    document.querySelectorAll("button").forEach((btn) => {
      expect(btn.querySelectorAll("button").length).toBe(0)
    })
  })
})

describe("focusable CTAs have discernible text", () => {
  it("BrandMark renders accessible text when wordmark is hidden", () => {
    render(<BrandMark showWordmark={false} />)

    // When wordmark is hidden, the SVG must carry an aria-label.
    const img = screen.getByRole("img", { name: "Milkcrate" })
    expect(img).toBeInTheDocument()
  })

  it("keeps icon-only identity discernible at hero size", () => {
    render(<BrandMark size="large" showWordmark={false} />)

    const img = screen.getByRole("img", { name: "Milkcrate" })
    expect(img).toHaveAttribute("width", "40")
    expect(img).toHaveClass("text-mc-text")
  })

  it("BrandMark wordmark text is accessible by default", () => {
    render(<BrandMark />)

    // Default: wordmark provides the name, SVG is decorative.
    expect(screen.getByText("Milkcrate")).toBeInTheDocument()
    const svg = document.querySelector("svg")
    expect(svg).toHaveAttribute("aria-hidden", "true")
  })

  it("discernible text: all links have accessible names", () => {
    render(
      <MilkcrateShell
        header={
          <header>
            <BrandMark />
            <a href="/apply">Get your store</a>
          </header>
        }
      >
        <div>Content</div>
      </MilkcrateShell>
    )

    const links = document.querySelectorAll("a")
    for (const link of links) {
      const hasText =
        (link.textContent?.trim() || "").length > 0 ||
        link.hasAttribute("aria-label") ||
        link.hasAttribute("aria-labelledby")

      expect(hasText).toBe(true)
    }
  })
})

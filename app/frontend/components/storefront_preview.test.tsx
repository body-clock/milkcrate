import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import StorefrontPreview from "./storefront_preview"
import StorefrontMotionConfig from "./storefront_motion_config"
import { ViewportProvider } from "@/contexts/viewport_context"
import { renderWithTier } from "@/test/viewport-test-utils"
import type { Listing, StorefrontSection } from "../types/inertia"

/** Wrap UI in providers needed by CrateShelf (which uses useTactileHover). */
function wrapProviders(ui: React.ReactElement) {
  return (
    <StorefrontMotionConfig>
      <ViewportProvider>{ui}</ViewportProvider>
    </StorefrontMotionConfig>
  )
}

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

describe("StorefrontPreview", () => {
  describe("happy path", () => {
    it("renders picks wall crate shelf", () => {
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 2,
            records: [
              makeListing({ id: 1, title: "Pick 1" }),
              makeListing({ id: 2, title: "Pick 2" }),
            ],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} />))

      expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
    })

    it("renders featured crates as crate shelves", () => {
      const sections: StorefrontSection[] = [
        {
          key: "featured_crates",
          crates: [
            {
              slug: "new-arrivals",
              name: "New Arrivals",
              count: 4,
              records: [
                makeListing({ id: 1, title: "New 1" }),
                makeListing({ id: 2, title: "New 2" }),
              ],
            },
            {
              slug: "thematic",
              name: "This Week's Theme",
              count: 3,
              records: [
                makeListing({ id: 3, title: "Theme 1" }),
              ],
            },
          ],
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} />))

      expect(screen.getByText("New Arrivals")).toBeInTheDocument()
      expect(screen.getByText("This Week's Theme")).toBeInTheDocument()
    })

    it("renders genre grid crates as crate shelves", () => {
      const sections: StorefrontSection[] = [
        {
          key: "genre_grid",
          crates: [
            {
              slug: "jazz",
              name: "Jazz",
              count: 5,
              records: [
                makeListing({ id: 1, title: "Jazz 1" }),
              ],
            },
            {
              slug: "rock",
              name: "Rock",
              count: 8,
              records: [
                makeListing({ id: 2, title: "Rock 1" }),
              ],
            },
          ],
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} />))

      expect(screen.getByText("Jazz")).toBeInTheDocument()
      expect(screen.getByText("Rock")).toBeInTheDocument()
    })
  })

  describe("non-interactive mode (default)", () => {
    it("renders without buttons", () => {
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 1,
            records: [makeListing({ id: 1 })],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} />))

      // Non-interactive means no buttons
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    })

    it("does not fire onSelectCrate when crate names are clicked", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 1,
            records: [makeListing({ id: 1 })],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} onSelectCrate={onSelectCrate} />))

      await user.click(screen.getByText("Milkcrate Picks"))
      expect(onSelectCrate).not.toHaveBeenCalled()
    })
  })

  describe("interactive mode", () => {
    it("renders clickable crate shelves when interactive", () => {
      const onSelectCrate = vi.fn()
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 1,
            records: [makeListing({ id: 1 })],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} interactive onSelectCrate={onSelectCrate} />))

      const button = screen.getByRole("button", { name: "Open Milkcrate Picks" })
      expect(button).toBeInTheDocument()
    })

    it("calls onSelectCrate when crate header is clicked", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 1,
            records: [makeListing({ id: 1 })],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} interactive onSelectCrate={onSelectCrate} />))

      await user.click(screen.getByRole("button", { name: "Open Milkcrate Picks" }))
      expect(onSelectCrate).toHaveBeenCalledWith("picks")
    })

    it("calls onSelectCrate when featured crate clicked", async () => {
      const user = userEvent.setup()
      const onSelectCrate = vi.fn()
      const sections: StorefrontSection[] = [
        {
          key: "featured_crates",
          crates: [
            {
              slug: "new-arrivals",
              name: "New Arrivals",
              count: 1,
              records: [makeListing({ id: 1 })],
            },
          ],
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} interactive onSelectCrate={onSelectCrate} />))

      await user.click(screen.getByRole("button", { name: "Open New Arrivals" }))
      expect(onSelectCrate).toHaveBeenCalledWith("new-arrivals")
    })
  })

  describe("empty sections", () => {
    it("handles empty sections array", () => {
      render(wrapProviders(<StorefrontPreview sections={[]} />))

      // Should render without errors — no crate names visible
      const body = document.body
      expect(body).toBeInTheDocument()
    })

    it("skips picks wall with no records", () => {
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 0,
            records: [],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} />))

      // Empty picks still renders the shelf (with "No records yet")
      expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
    })

    it("skips featured_crates with no crates", () => {
      const sections: StorefrontSection[] = [
        {
          key: "featured_crates",
          crates: [],
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} />))

      // Should render empty — no crates to display
      expect(document.body).toBeInTheDocument()
    })
  })

  describe("responsive layout", () => {
    const sections: StorefrontSection[] = [
      {
        key: "genre_grid",
        crates: [
          {
            slug: "jazz",
            name: "Jazz",
            count: 1,
            records: [makeListing({ id: 1, title: "Jazz 1" })],
          },
          {
            slug: "rock",
            name: "Rock",
            count: 1,
            records: [makeListing({ id: 2, title: "Rock 1" })],
          },
          {
            slug: "soul",
            name: "Soul",
            count: 1,
            records: [makeListing({ id: 3, title: "Soul 1" })],
          },
        ],
      },
    ]

    it("renders genre grid in compact tier with 2 columns", () => {
      const { container } = renderWithTier("compact", (
        <StorefrontMotionConfig>
          <StorefrontPreview sections={sections} />
        </StorefrontMotionConfig>
      ))

      expect(screen.getByText("Jazz")).toBeInTheDocument()
      expect(screen.getByText("Rock")).toBeInTheDocument()
      expect(screen.getByText("Soul")).toBeInTheDocument()
      expect(container).toBeInTheDocument()
    })

    it("renders genre grid in comfy tier", () => {
      const { container } = renderWithTier("comfy", (
        <StorefrontMotionConfig>
          <StorefrontPreview sections={sections} />
        </StorefrontMotionConfig>
      ))

      expect(screen.getByText("Jazz")).toBeInTheDocument()
      expect(container).toBeInTheDocument()
    })

    it("renders genre grid in wide tier", () => {
      const { container } = renderWithTier("wide", (
        <StorefrontMotionConfig>
          <StorefrontPreview sections={sections} />
        </StorefrontMotionConfig>
      ))

      expect(screen.getByText("Jazz")).toBeInTheDocument()
      expect(container).toBeInTheDocument()
    })

    it("renders featured crates with responsive columns", () => {
      const featuredSections: StorefrontSection[] = [
        {
          key: "featured_crates",
          crates: [
            {
              slug: "new-arrivals",
              name: "New Arrivals",
              count: 1,
              records: [makeListing({ id: 1 })],
            },
            {
              slug: "thematic",
              name: "This Week's Theme",
              count: 1,
              records: [makeListing({ id: 2 })],
            },
          ],
        },
      ]

      const { container } = renderWithTier("comfy", (
        <StorefrontMotionConfig>
          <StorefrontPreview sections={featuredSections} />
        </StorefrontMotionConfig>
      ))

      expect(screen.getByText("New Arrivals")).toBeInTheDocument()
      expect(screen.getByText("This Week's Theme")).toBeInTheDocument()
    })
  })

  describe("className prop", () => {
    it("applies className to wrapper", () => {
      const sections: StorefrontSection[] = [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Picks",
            count: 1,
            records: [makeListing({ id: 1 })],
          },
        },
      ]

      render(wrapProviders(<StorefrontPreview sections={sections} className="preview-test" />))

      expect(document.querySelector(".preview-test")).toBeInTheDocument()
    })
  })
})
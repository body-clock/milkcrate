import React from "react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PileSheet from "./pile_sheet"
import { PileProvider, usePileContext } from "../contexts/pile_context"
import { ViewportProvider } from "../contexts/viewport_context"
import { renderWithTier } from "../test/viewport-test-utils"
import type { Listing } from "../types/inertia"

// PileSheet no longer needs ShopperContext or Inertia usePage mocks

beforeEach(() => {
  localStorage.clear()
})

let nextId = 1000
const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: nextId++,
  discogs_listing_id: `discogs-${nextId}`,
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

/** Render PileSheet in full providers, with a component that populates the pile. */
function renderPileSheet(
  pileRecords: Listing[] = [],
  props: { open?: boolean; onClose?: () => void } = {},
) {
  const onClose = props.onClose ?? vi.fn()
  const open = props.open ?? true

  function PilePopulator({ children }: { children: React.ReactNode }) {
    const { addToPile } = usePileContext()
    React.useEffect(() => {
      pileRecords.forEach((r) => addToPile(r))
    }, [])
    return <>{children}</>
  }

  return render(
    <ViewportProvider>
      <PileProvider>
        <PilePopulator>
          <PileSheet open={open} onClose={onClose} />
        </PilePopulator>
      </PileProvider>
    </ViewportProvider>,
  )
}

describe("PileSheet", () => {
  describe("dialog mechanics", () => {
    it("renders as a dialog with aria-modal", () => {
      renderPileSheet()
      const dialog = screen.getByRole("dialog")
      expect(dialog).toHaveAttribute("aria-modal", "true")
    })

    it("has aria-labelledby pointing to pile-sheet-title", () => {
      renderPileSheet()
      const dialog = screen.getByRole("dialog")
      expect(dialog).toHaveAttribute("aria-labelledby", "pile-sheet-title")
      const title = document.getElementById("pile-sheet-title")
      expect(title).toBeInTheDocument()
    })

    it("closes on Escape key", async () => {
      const onClose = vi.fn()
      renderPileSheet([], { onClose })
      await userEvent.keyboard("{Escape}")
      expect(onClose).toHaveBeenCalledOnce()
    })

    it("closes on backdrop click", async () => {
      const onClose = vi.fn()
      const { container } = render(
        <ViewportProvider>
          <PileProvider>
            <PileSheet open={true} onClose={onClose} />
          </PileProvider>
        </ViewportProvider>,
      )
      const backdrop = container.querySelector('[aria-hidden="true"]')
      expect(backdrop).toBeInTheDocument()
      if (backdrop) {
        await userEvent.click(backdrop)
      }
      expect(onClose).toHaveBeenCalledOnce()
    })

    it("closes on close button click", async () => {
      const onClose = vi.fn()
      renderPileSheet([], { onClose })
      const closeBtn = screen.getByRole("button", { name: /close pile/i })
      await userEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalledOnce()
    })

    it("does not render when open is false", () => {
      render(
        <ViewportProvider>
          <PileProvider>
            <PileSheet open={false} onClose={vi.fn()} />
          </PileProvider>
        </ViewportProvider>,
      )
      expect(screen.queryByRole("dialog")).toBeNull()
    })
  })

  describe("empty state", () => {
    it("shows empty message when pile is empty", () => {
      renderPileSheet([])
      expect(screen.getByText(/no records in your pile yet/i)).toBeInTheDocument()
    })

    it("does not show footer when pile is empty", () => {
      renderPileSheet([])
      expect(screen.queryByText("Total")).toBeNull()
    })
  })

  describe("record display", () => {
    it("renders records with title and artist", async () => {
      renderPileSheet([
        makeListing({ title: "Abbey Road", artist: "The Beatles" }),
        makeListing({ title: "Dark Side", artist: "Pink Floyd" }),
      ])

      await waitFor(() => {
        expect(screen.getByText("Abbey Road")).toBeInTheDocument()
        expect(screen.getByText("The Beatles")).toBeInTheDocument()
        expect(screen.getByText("Dark Side")).toBeInTheDocument()
        expect(screen.getByText("Pink Floyd")).toBeInTheDocument()
      })
    })

    it("renders record price using formatPriceValue", async () => {
      renderPileSheet([
        makeListing({ price: "15.99", currency: "USD" }),
      ])

      await waitFor(() => {
        const prices = screen.getAllByText("$15.99")
        expect(prices.length).toBeGreaterThanOrEqual(1)
      })
    })

    it("shows — for records with null price", async () => {
      renderPileSheet([
        makeListing({ price: "" }),
      ])

      await waitFor(() => {
        expect(screen.getByText("—")).toBeInTheDocument()
      })
    })

    it("shows ♪ fallback for records with no cover image", async () => {
      renderPileSheet([
        makeListing({ cover_image_url: null, thumbnail_url: null }),
      ])

      await waitFor(() => {
        expect(screen.getByText("♪")).toBeInTheDocument()
      })
    })
  })

  describe("record removal", () => {
    it("removes a record from the pile via the × button", async () => {
      renderPileSheet([
        makeListing({ title: "Remove Me" }),
      ])

      await waitFor(() => {
        expect(screen.getByText("Remove Me")).toBeInTheDocument()
      })

      const removeBtn = screen.getByRole("button", { name: /remove.*pile/i })
      await userEvent.click(removeBtn)

      await waitFor(() => {
        expect(screen.queryByText("Remove Me")).toBeNull()
        expect(screen.getByText(/no records in your pile yet/i)).toBeInTheDocument()
      })
    })
  })

  describe("total calculation", () => {
    it("shows sum of all record prices", async () => {
      renderPileSheet([
        makeListing({ price: "10.00", currency: "USD" }),
        makeListing({ price: "15.50", currency: "USD" }),
      ])

      await waitFor(() => {
        // The footer total is a span inside the footer
        const footerTotals = screen.getAllByText(/^\$\d+\.\d{2}$/)
        // Should be three: two per-record prices + one footer total
        const totalTexts = footerTotals.map((el) => el.textContent)
        expect(totalTexts).toContain("$25.50")
      })
    })

    it("handles records with null prices in total", async () => {
      renderPileSheet([
        makeListing({ price: "10.00", currency: "USD" }),
        makeListing({ price: "" }),
      ])

      await waitFor(() => {
        // Footer total should be $10.00
        const priceElements = screen.getAllByText("$10.00")
        // At least one $10.00 per-record + footer total
        expect(priceElements.length).toBeGreaterThanOrEqual(1)
      })
    })

    it("shows Total label in footer when pile has records", async () => {
      renderPileSheet([
        makeListing({ price: "5.00", currency: "USD" }),
      ])

      await waitFor(() => {
        expect(screen.getByText("Total")).toBeInTheDocument()
      })
    })
  })

  describe("confirmClear flow", () => {
    it("shows Clear button when pile has records", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.getByText("Clear")).toBeInTheDocument()
      })
    })

    it("shows confirmation after clicking Clear", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.getByText("Clear")).toBeInTheDocument()
      })

      await userEvent.click(screen.getByText("Clear"))

      await waitFor(() => {
        expect(screen.getByText("Sure?")).toBeInTheDocument()
        expect(screen.getByText("Yes")).toBeInTheDocument()
        expect(screen.getByText("No")).toBeInTheDocument()
      })
    })

    it("cancels clear when No is clicked", async () => {
      renderPileSheet([makeListing({ title: "Keep Me" })])

      await waitFor(() => expect(screen.getByText("Clear")).toBeInTheDocument())
      await userEvent.click(screen.getByText("Clear"))

      await waitFor(() => expect(screen.getByText("No")).toBeInTheDocument())
      await userEvent.click(screen.getByText("No"))

      await waitFor(() => {
        expect(screen.getByText("Clear")).toBeInTheDocument()
        expect(screen.getByText("Keep Me")).toBeInTheDocument()
        expect(screen.queryByText("Sure?")).toBeNull()
      })
    })

    it("clears pile when Yes is clicked", async () => {
      renderPileSheet([makeListing({ title: "Delete Me" })])

      await waitFor(() => expect(screen.getByText("Clear")).toBeInTheDocument())
      await userEvent.click(screen.getByText("Clear"))

      await waitFor(() => expect(screen.getByText("Yes")).toBeInTheDocument())
      await userEvent.click(screen.getByText("Yes"))

      await waitFor(() => {
        expect(screen.getByText(/no records in your pile yet/i)).toBeInTheDocument()
      })
    })

    it("hides Clear button when pile is empty", () => {
      renderPileSheet([])
      expect(screen.queryByText("Clear")).toBeNull()
    })
  })

  describe("responsive layout", () => {
    it("renders as bottom-sheet in compact tier", () => {
      const { container } = renderWithTier(
        "compact",
        <PileProvider>
          <PileSheet open={true} onClose={vi.fn()} />
        </PileProvider>,
      )

      const dialog = screen.getByRole("dialog")
      expect(dialog.className).toContain("bottom-0")
    })

    it("renders as side-panel in wide tier", () => {
      renderWithTier(
        "wide",
        <PileProvider>
          <PileSheet open={true} onClose={vi.fn()} />
        </PileProvider>,
      )

      const dialog = screen.getByRole("dialog")
      expect(dialog.className).toContain("right-0")
    })

    it("shows drag handle bar in compact tier", () => {
      const { container } = renderWithTier(
        "compact",
        <PileProvider>
          <PileSheet open={true} onClose={vi.fn()} />
        </PileProvider>,
      )

      // Drag handle: a 12px wide, 1.5px tall rounded bar inside the dialog
      const dialog = screen.getByRole("dialog")
      const handle = dialog.querySelector(".w-12")
      expect(handle).toBeInTheDocument()
    })

    it("does not show drag handle in wide tier", () => {
      const { container } = renderWithTier(
        "wide",
        <PileProvider>
          <PileSheet open={true} onClose={vi.fn()} />
        </PileProvider>,
      )

      const dialog = screen.getByRole("dialog")
      const handle = dialog.querySelector(".w-12")
      expect(handle).toBeNull()
    })
  })

  describe("pile count in header", () => {
    it("shows record count in the header", async () => {
      renderPileSheet([
        makeListing(),
        makeListing(),
        makeListing(),
      ])

      await waitFor(() => {
        const title = document.getElementById("pile-sheet-title")
        expect(title?.textContent).toContain("3 records")
      })
    })

    it("does not show count when pile is empty", () => {
      renderPileSheet([])

      const title = document.getElementById("pile-sheet-title")
      expect(title?.textContent).not.toContain("records")
    })
  })

  describe("Add all to Discogs cart button", () => {
    it("shows add to cart button when pile has records", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        const btn = screen.getByText(/add all to discogs cart/i)
        expect(btn).toBeInTheDocument()
        expect(btn).not.toBeDisabled()
      })
    })

    it("does not show add to cart button when pile is empty", () => {
      renderPileSheet([])

      expect(screen.queryByText(/add all to discogs cart/i)).toBeNull()
    })
  })
})

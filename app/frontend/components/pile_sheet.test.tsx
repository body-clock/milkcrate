import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PileSheet from "./pile_sheet"
import { PileProvider, usePileContext } from "../contexts/pile_context"
import { ViewportProvider } from "../contexts/viewport_context"
import { ShopperProvider } from "../contexts/shopper_context"
import { renderWithTier } from "../test/viewport-test-utils"
import type { Listing } from "../types/inertia"

const mockedPage = vi.hoisted(() => ({
  shopper: { discogs_username: "shopper1" } as { discogs_username: string } | null,
}))

// Mock usePage to provide store context
vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual("@inertiajs/react")
  return {
    ...actual,
    usePage: () => ({
      props: {
        store: {
          discogs_username: "test-store",
          name: "Test Store",
          handoff_available: true,
        },
        shopper: mockedPage.shopper,
      },
    }),
  }
})

beforeEach(() => {
  localStorage.clear()
  mockedPage.shopper = { discogs_username: "shopper1" }
})

afterEach(() => {
  vi.unstubAllGlobals()
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
      <ShopperProvider>
        <PileProvider>
          <PilePopulator>
            <PileSheet open={open} onClose={onClose} />
          </PilePopulator>
        </PileProvider>
      </ShopperProvider>
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

    it("focuses the static pile title when the dialog opens", async () => {
      renderPileSheet([makeListing()])

      const title = document.getElementById("pile-sheet-title")
      await waitFor(() => expect(title).toHaveFocus())
      expect(title).toHaveAttribute("tabindex", "-1")
    })

    it("contains forward and reverse tab navigation inside the dialog", async () => {
      const user = userEvent.setup()
      renderPileSheet([makeListing()])

      const dialog = screen.getByRole("dialog")
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"))
      focusable.at(-1)?.focus()
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)

      focusable[0]?.focus()
      await user.tab({ shift: true })
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
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
          <ShopperProvider>
            <PileProvider>
              <PileSheet open={true} onClose={onClose} />
            </PileProvider>
          </ShopperProvider>
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
          <ShopperProvider>
            <PileProvider>
              <PileSheet open={false} onClose={vi.fn()} />
            </PileProvider>
          </ShopperProvider>
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

    it("keeps focus inside the modal after removing the focused final record", async () => {
      const user = userEvent.setup()
      renderPileSheet([makeListing({ title: "Last Record" })])

      await user.click(await screen.findByRole("button", { name: "Remove Last Record from pile" }))

      const dialog = screen.getByRole("dialog")
      await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
      expect(document.getElementById("pile-sheet-title")).toHaveFocus()
    })
  })

  describe("total calculation", () => {
    it("shows sum of all record prices", async () => {
      renderPileSheet([
        makeListing({ price: "10.00", currency: "USD" }),
        makeListing({ price: "15.50", currency: "USD" }),
      ])

      await waitFor(() => {
        const footerTotals = screen.getAllByText(/^\$\d+\.\d{2}$/)
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
        const priceElements = screen.getAllByText("$10.00")
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

    it("places the total before the Discogs handoff action", async () => {
      renderPileSheet([makeListing()])

      const totalLabel = await screen.findByText("Total")
      const action = await screen.findByRole("button", { name: "Send to Discogs Wantlist" })

      expect(totalLabel.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
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

    it("uses touch-sized targets for remove, clear confirmation, and close actions", async () => {
      const user = userEvent.setup()
      renderPileSheet([makeListing()])

      expect(await screen.findByRole("button", { name: /remove.*pile/i })).toHaveClass("h-11", "w-11")
      expect(screen.getByRole("button", { name: "Close pile" })).toHaveClass("h-11", "w-11")

      const clear = screen.getByRole("button", { name: /clear.*pile/i })
      expect(clear).toHaveClass("min-h-11", "min-w-11")
      await user.click(clear)

      expect(screen.getByRole("button", { name: "Yes" })).toHaveClass("min-h-11", "min-w-11")
      expect(screen.getByRole("button", { name: "No" })).toHaveClass("min-h-11", "min-w-11")
    })
  })

  describe("responsive layout", () => {
    it("renders as a full-screen safe-area workflow in compact tier", () => {
      renderWithTier(
        "compact",
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={vi.fn()} />
          </PileProvider>
        </ShopperProvider>,
      )

      const dialog = screen.getByRole("dialog")
      expect(dialog).toHaveClass("inset-0", "h-dvh")
      expect(dialog).not.toHaveClass("max-h-[85vh]", "rounded-t-2xl")
      expect(dialog.className).toContain("pt-[env(safe-area-inset-top)]")
      expect(dialog.className).toContain("pb-[env(safe-area-inset-bottom)]")
    })

    it("renders as side-panel in wide tier", () => {
      renderWithTier(
        "wide",
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={vi.fn()} />
          </PileProvider>
        </ShopperProvider>,
      )

      const dialog = screen.getByRole("dialog")
      expect(dialog.className).toContain("right-0")
    })

    it("does not show the obsolete bottom-sheet drag handle in compact tier", () => {
      renderWithTier(
        "compact",
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={vi.fn()} />
          </PileProvider>
        </ShopperProvider>,
      )

      const dialog = screen.getByRole("dialog")
      const handle = dialog.querySelector(".w-12")
      expect(handle).toBeNull()
    })

    it("does not show drag handle in wide tier", () => {
      const { container } = renderWithTier(
        "wide",
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={vi.fn()} />
          </PileProvider>
        </ShopperProvider>,
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

  describe("Wantlist handoff action", () => {
    it("shows the Send to Wantlist button when handoff is available and shopper is connected", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.getByText("Send to Discogs Wantlist")).toBeInTheDocument()
      })
    })

    it("shows disclosure text about the store-scoped handoff", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.getByText(/Get these records from/)).toBeInTheDocument()
      })
    })

    it("shows connected account status and an explicit disconnect action in a populated pile", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.getByText(/Connected to Discogs as @shopper1/)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument()
      })
    })

    it("announces the Wantlist result without making record review live", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ wantlist_url: null, added: 1, skipped: 0 }),
      }))
      const user = userEvent.setup()
      renderPileSheet([makeListing()])

      await user.click(await screen.findByRole("button", { name: "Send to Discogs Wantlist" }))

      const result = await screen.findByRole("status")
      expect(result).toHaveAttribute("aria-live", "polite")
      expect(result).toHaveTextContent("1 release added to your Wantlist")
      expect(screen.getByRole("list")).not.toHaveAttribute("aria-live")
    })

    it("only presents the connect form for a populated eligible disconnected pile", async () => {
      mockedPage.shopper = null
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Connect with Discogs" })).toBeInTheDocument()
      })

      const form = screen.getByRole("button", { name: "Connect with Discogs" }).closest("form")
      expect(form?.querySelector("input[name='store_slug']")).toHaveAttribute("value", "test-store")
      expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument()
    })

    it("does not show old cart button", async () => {
      renderPileSheet([makeListing()])

      await waitFor(() => {
        expect(screen.queryByText(/add all to discogs cart/i)).toBeNull()
      })
    })
  })
})

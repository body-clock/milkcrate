import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PileSheet from "../pile_sheet"
import { PileProvider, usePileContext } from "../../contexts/pile_context"
import { ViewportProvider } from "../../contexts/viewport_context"
import { ShopperProvider } from "../../contexts/shopper_context"
import { renderWithTier } from "../../test/viewport-test-utils"
import type { Listing } from "../../types/inertia"

const mockedPage = vi.hoisted(() => ({
  shopper: { discogs_username: "shopper1" } as { discogs_username: string } | null,
}))

vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual("@inertiajs/react")
  return {
    ...actual,
    usePage: () => ({
      props: {
        store: { discogs_username: "test-store", name: "Test Store", handoff_available: true },
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

describe("PileSheet responsive layout", () => {
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

    expect(screen.getByRole("dialog").className).toContain("right-0")
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
    expect(dialog.querySelector(".w-12")).toBeNull()
  })

  it("does not show drag handle in wide tier", () => {
    renderWithTier(
      "wide",
      <ShopperProvider>
        <PileProvider>
          <PileSheet open={true} onClose={vi.fn()} />
        </PileProvider>
      </ShopperProvider>,
    )

    const dialog = screen.getByRole("dialog")
    expect(dialog.querySelector(".w-12")).toBeNull()
  })
})

describe("PileSheet pile count in header", () => {
  function renderPileSheet(pileRecords: Listing[]) {
    function PilePopulator({ children }: { children: React.ReactNode }) {
      const { addToPile } = usePileContext()
      React.useEffect(() => { pileRecords.forEach((r) => addToPile(r)) }, [])
      return <>{children}</>
    }

    return render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PilePopulator>
              <PileSheet open={true} onClose={vi.fn()} />
            </PilePopulator>
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    )
  }

  it("shows record count in the header", async () => {
    renderPileSheet([makeListing(), makeListing(), makeListing()])

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

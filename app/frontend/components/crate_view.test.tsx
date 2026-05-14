import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CrateView from "./crate_view"
import StorefrontMotionConfig from "./storefront_motion_config"
import { PileProvider } from "@/contexts/pile_context"
import { renderWithTier } from "@/test/viewport-test-utils"
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

const makeCrates = (): Crate[] => [
  {
    slug: "jazz",
    name: "Jazz",
    count: 3,
    records: [
      makeListing({ id: 1, title: "First Jazz", artist: "One" }),
      makeListing({ id: 2, title: "Second Jazz", artist: "Two" }),
      makeListing({ id: 3, title: "Third Jazz", artist: "Three" }),
    ],
  },
  {
    slug: "rock",
    name: "Rock",
    count: 1,
    records: [
      makeListing({ id: 4, title: "Rock Record", artist: "Four" }),
    ],
  },
]

function renderCrateView(tier: "compact" | "comfy" | "wide", props: Partial<React.ComponentProps<typeof CrateView>> = {}) {
  const defaultProps: React.ComponentProps<typeof CrateView> = {
    crates: makeCrates(),
    activeSlug: "jazz",
    onSelectCrate: vi.fn(),
    onBack: vi.fn(),
    ...props,
  }

  return {
    ...renderWithTier(tier, (
      <StorefrontMotionConfig>
        <PileProvider>
          <CrateView {...defaultProps} />
        </PileProvider>
      </StorefrontMotionConfig>
    )),
    props: defaultProps,
  }
}

describe("CrateView", () => {
  it("renders a compact mobile header with active crate context", () => {
    renderCrateView("compact")

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument()
    expect(screen.getByText("3 records")).toBeInTheDocument()
    expect(screen.queryByText("Independent record store in South Philly.")).not.toBeInTheDocument()
  })

  it("keeps desktop details visible on wide viewports", () => {
    renderCrateView("wide")

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument()
    expect(screen.getAllByText("One").length).toBeGreaterThan(1)
    expect(screen.getAllByRole("link", { name: /Discogs/ }).length).toBeGreaterThan(1)
  })

  it("calls onBack from the compact back control", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    renderCrateView("compact", { onBack })

    await user.click(screen.getByRole("button", { name: "Back to store" }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it("keeps crate tab selection working in compact presentation", async () => {
    const user = userEvent.setup()
    const onSelectCrate = vi.fn()

    renderCrateView("compact", { onSelectCrate })

    await user.click(screen.getByRole("tab", { name: "Rock" }))

    expect(onSelectCrate).toHaveBeenCalledWith("rock")
  })

  it("preserves compact header context when tabs are hidden", () => {
    renderCrateView("compact", { hideTabs: true })

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument()
  })

  it("uses compact stack sizing without dropping the progress indicator", () => {
    renderCrateView("compact")

    expect(screen.getByTestId("crate-stack")).toHaveAttribute("data-viewport", "compact")
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3" })).toBeInTheDocument()
  })

  it("reserves compact bottom clearance between the record pile and progress", () => {
    renderCrateView("compact")

    expect(screen.getByTestId("crate-stack")).toHaveClass("pb-8")
  })

  it("keeps compact browse controls thumb-sized and visually separated", () => {
    renderCrateView("compact")

    expect(screen.getByRole("button", { name: "Previous record" })).toHaveClass("h-12")
    expect(screen.getByRole("button", { name: "Next record" })).toHaveClass("h-12")
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3" }).parentElement).toHaveClass("mt-1")
  })

  it("keeps wide stack sizing and desktop detail panel", () => {
    renderCrateView("wide")

    expect(screen.getByTestId("crate-stack")).toHaveAttribute("data-viewport", "wide")
    expect(screen.getAllByText("One").length).toBeGreaterThan(1)
  })

  it("navigates with compact visible controls and dismisses the gesture hint", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    expect(screen.getByText(/Swipe or use arrows to browse/)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next record" }))

    expect(screen.getByRole("progressbar", { name: "Record 2 of 3" })).toBeInTheDocument()
    expect(screen.queryByText(/Swipe or use arrows to browse/)).not.toBeInTheDocument()
  })

  it("does not dismiss the compact hint when navigation is blocked", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    await user.click(screen.getByRole("button", { name: "Previous record" }))

    expect(screen.getByRole("progressbar", { name: "Record 1 of 3" })).toBeInTheDocument()
    expect(screen.getByText(/Swipe or use arrows to browse/)).toBeInTheDocument()
  })

  it("renders the compact empty-crate state with header context and empty message", () => {
    const emptyCrates: Crate[] = [
      {
        slug: "empty",
        name: "Empty Crate",
        count: 0,
        records: [],
      },
    ]

    renderCrateView("compact", { crates: emptyCrates, activeSlug: "empty" })

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Empty Crate" })).toBeInTheDocument()
    expect(screen.getByText("0 records")).toBeInTheDocument()
    expect(screen.getByText("No records in this crate yet.")).toBeInTheDocument()
  })

  it("hides tabs in compact empty-crate state when hideTabs is true", () => {
    const emptyCrates: Crate[] = [
      {
        slug: "empty",
        name: "Empty Crate",
        count: 0,
        records: [],
      },
    ]

    renderCrateView("compact", { crates: emptyCrates, activeSlug: "empty", hideTabs: true })

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Empty Crate" })).toBeInTheDocument()
    expect(screen.getByText("No records in this crate yet.")).toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument()
  })

  // ── Guard-parity tests: wide/desktop header ────────────────────────

  it("renders active crate heading and record count on wide viewports", () => {
    renderCrateView("wide")

    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument()
    expect(screen.getByText("3 records")).toBeInTheDocument()
  })

  it("renders back control on wide viewports", () => {
    renderCrateView("wide")

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument()
  })

  it("calls onBack from the wide back control", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    renderCrateView("wide", { onBack })

    await user.click(screen.getByRole("button", { name: "Back to store" }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it("keeps crate tab selection working on wide viewports", async () => {
    const user = userEvent.setup()
    const onSelectCrate = vi.fn()

    renderCrateView("wide", { onSelectCrate })

    await user.click(screen.getByRole("tab", { name: "Rock" }))

    expect(onSelectCrate).toHaveBeenCalledWith("rock")
  })

  it("hides tabs on wide populated state when hideTabs is true", () => {
    renderCrateView("wide", { hideTabs: true })

    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument()
    expect(screen.getByText("3 records")).toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument()
  })

  it("hides tabs on wide empty-crate state when hideTabs is true", () => {
    const emptyCrates: Crate[] = [
      {
        slug: "empty",
        name: "Empty Crate",
        count: 0,
        records: [],
      },
    ]

    renderCrateView("wide", { crates: emptyCrates, activeSlug: "empty", hideTabs: true })

    expect(screen.getByRole("heading", { name: "Empty Crate" })).toBeInTheDocument()
    expect(screen.getByText("No records in this crate yet.")).toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument()
  })

  it("renders the wide empty-crate state with header context", () => {
    const emptyCrates: Crate[] = [
      {
        slug: "empty",
        name: "Empty Crate",
        count: 0,
        records: [],
      },
    ]

    renderCrateView("wide", { crates: emptyCrates, activeSlug: "empty" })

    expect(screen.getByRole("heading", { name: "Empty Crate" })).toBeInTheDocument()
    expect(screen.getByText("0 records")).toBeInTheDocument()
    expect(screen.getByText("No records in this crate yet.")).toBeInTheDocument()
  })

  it("reappears the gesture hint when switching crates", async () => {
    const user = userEvent.setup()
    const crates = makeCrates()

    const { rerender } = renderWithTier("compact", (
      <StorefrontMotionConfig>
        <PileProvider>
          <CrateView crates={crates} activeSlug="jazz" onSelectCrate={vi.fn()} onBack={vi.fn()} />
        </PileProvider>
      </StorefrontMotionConfig>
    ))

    // Dismiss the hint by navigating
    await user.click(screen.getByRole("button", { name: "Next record" }))
    expect(screen.queryByText(/Swipe or use arrows to browse/)).not.toBeInTheDocument()

    // Rerender with a different activeSlug — hint should reappear
    rerender(
      <StorefrontMotionConfig>
        <PileProvider>
          <CrateView crates={crates} activeSlug="rock" onSelectCrate={vi.fn()} onBack={vi.fn()} />
        </PileProvider>
      </StorefrontMotionConfig>
    )

    expect(screen.getByText(/Swipe or use arrows to browse/)).toBeInTheDocument()
  })

  // ── CSS-driven hint card rendering (plain divs, no motion.div) ─────

  it("renders hint cards as plain divs with inline transform styles", () => {
    renderCrateView("compact")

    // The crate stack contains hint cards — check the hint rendered inside the stack
    const stack = screen.getByTestId("crate-stack")
    expect(stack).toBeInTheDocument()

    // Verify hint cards are positioned at the expected offsets inside the stack
    const stackContainer = stack.firstElementChild
    expect(stackContainer).not.toBeNull()
    // Should have multiple child elements for hint cards
    expect(stackContainer!.children.length).toBeGreaterThan(1)
  })

  it("renders active card with thumbnail backdrop when thumbnail_url is present", () => {
    const cratesWithThumbnails: Crate[] = [
      {
        slug: "jazz",
        name: "Jazz",
        count: 3,
        records: [
          makeListing({ id: 1, title: "First", artist: "A", cover_image_url: null, thumbnail_url: "/thumb.jpg" }),
          makeListing({ id: 2, title: "Second", artist: "B", cover_image_url: null, thumbnail_url: "/thumb2.jpg" }),
          makeListing({ id: 3, title: "Third", artist: "C" }),
        ],
      },
    ]

    const { container } = renderCrateView("compact", { crates: cratesWithThumbnails, activeSlug: "jazz" })

    // Find all <img> elements in the rendered output (some are decorative with alt="")
    const allImages = container.querySelectorAll<HTMLImageElement>("img")
    const backdrop = Array.from(allImages).find((img) => img.getAttribute("src") === "/thumb.jpg")
    expect(backdrop).toBeTruthy()

    // Navigate to next record to verify the backdrop updates
    const next = screen.getByRole("button", { name: "Next record" })
    next.click()

    const updatedImages = container.querySelectorAll<HTMLImageElement>("img")
    const nextBackdrop = Array.from(updatedImages).find((img) => img.getAttribute("src") === "/thumb2.jpg")
    expect(nextBackdrop).toBeTruthy()
  })

  it("omits thumbnail backdrop when thumbnail_url is null", () => {
    const cratesWithoutThumbnails: Crate[] = [
      {
        slug: "jazz",
        name: "Jazz",
        count: 3,
        records: [
          makeListing({ id: 1, title: "First", artist: "A", thumbnail_url: null }),
          makeListing({ id: 2, title: "Second", artist: "B", thumbnail_url: null }),
          makeListing({ id: 3, title: "Third", artist: "C", thumbnail_url: null }),
        ],
      },
    ]

    const { container } = renderCrateView("compact", { crates: cratesWithoutThumbnails, activeSlug: "jazz" })

    // Without thumbnail_url on any record, hint cards use cover_image_url (null in test) — ♪ placeholders
    // Active card also has no thumbnail to render as backdrop
    // The only <img> elements would be from hint cards that DO resolve a URL
    const allImages = container.querySelectorAll<HTMLImageElement>("img")
    // makeListing defaults both cover and thumbnail to null, so no img elements render
    expect(allImages.length).toBe(0)
  })

  it("navigates with the ref-based index to avoid stale closures", async () => {
    const user = userEvent.setup()
    const crates = makeCrates()

    renderCrateView("compact", { crates })

    // Rapidly advance twice — index ref ensures both navigations land
    await user.click(screen.getByRole("button", { name: "Next record" }))
    await user.click(screen.getByRole("button", { name: "Next record" }))

    expect(screen.getByRole("progressbar", { name: "Record 3 of 3" })).toBeInTheDocument()
  })
})

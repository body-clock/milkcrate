import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CrateView from "./crate_view"
import StorefrontMotionConfig from "./storefront_motion_config"
import { RIFFLE_LANGUAGE } from "@/lib/riffle_navigation"
const GHOST_FINGER_CUE_COPY = "Pull down to dig deeper"
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
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
  })

  it("reserves compact bottom clearance between the record pile and progress", () => {
    renderCrateView("compact")

    expect(screen.getByTestId("crate-stack")).toHaveClass("pb-8")
  })

  it("keeps compact browse controls thumb-sized and visually separated", () => {
    renderCrateView("compact")

    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).toHaveClass("h-12")
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).toHaveClass("h-12")
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" }).parentElement).toHaveClass("mt-1")
  })

  it("keeps wide stack sizing and desktop detail panel", () => {
    renderCrateView("wide")

    expect(screen.getByTestId("crate-stack")).toHaveAttribute("data-viewport", "wide")
    expect(screen.getAllByText("One").length).toBeGreaterThan(1)
  })

  it.each(["compact", "comfy", "wide"] as const)("renders riffle controls and progress on %s tier", (tier) => {
    renderCrateView(tier)

    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
    expect(screen.getByText(RIFFLE_LANGUAGE.progressStart)).toBeInTheDocument()
    expect(screen.getByText(RIFFLE_LANGUAGE.progressEnd)).toBeInTheDocument()
  })

  it("clicking the deeper control advances one record and dismisses the gesture hint", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    // First-swipe lesson is eligible for compact populated unlearned users
    expect(screen.getByText(GHOST_FINGER_CUE_COPY)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))

    expect(screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" })).toBeInTheDocument()
    // showGestureHint is set false after navigation, hiding the cue
    expect(screen.queryByText(GHOST_FINGER_CUE_COPY)).not.toBeInTheDocument()
  })

  it("clicking the front control from record two returns to record one", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))
    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front }))

    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
  })

  it("does not dismiss the compact hint when front navigation is blocked", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    await user.keyboard("{ArrowUp}")

    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
    // showGestureHint stays true because navigation was blocked
    expect(screen.getByText(GHOST_FINGER_CUE_COPY)).toBeInTheDocument()
    expect(screen.getByText(RIFFLE_LANGUAGE.edgeStatus.front)).toBeInTheDocument()
  })

  it("keeps front and deeper controls labeled while disabled at crate edges", () => {
    const { unmount } = renderCrateView("compact")

    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).toBeDisabled()
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).not.toBeDisabled()

    unmount()
    renderCrateView("compact", { startIndex: 2 })

    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).not.toBeDisabled()
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).toBeDisabled()
  })

  it("announces the deeper edge without changing records", async () => {
    const user = userEvent.setup()

    renderCrateView("compact", { startIndex: 2 })

    await user.keyboard("{ArrowDown}")

    expect(screen.getByRole("progressbar", { name: "Record 3 of 3, front to deeper" })).toBeInTheDocument()
    expect(screen.getByText(RIFFLE_LANGUAGE.edgeStatus.deeper)).toBeInTheDocument()
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

  it("renders no riffle controls in compact empty-crate state", () => {
    const emptyCrates: Crate[] = [
      {
        slug: "empty",
        name: "Empty Crate",
        count: 0,
        records: [],
      },
    ]

    renderCrateView("compact", { crates: emptyCrates, activeSlug: "empty" })

    expect(screen.queryByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).not.toBeInTheDocument()
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
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).toBeInTheDocument()
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

  it("renders no riffle controls in wide empty-crate state", () => {
    const emptyCrates: Crate[] = [
      {
        slug: "empty",
        name: "Empty Crate",
        count: 0,
        records: [],
      },
    ]

    renderCrateView("wide", { crates: emptyCrates, activeSlug: "empty" })

    expect(screen.queryByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).not.toBeInTheDocument()
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
    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))
    expect(screen.queryByText(GHOST_FINGER_CUE_COPY)).not.toBeInTheDocument()

    // Rerender with a different activeSlug — hint should reappear because
    // showGestureHint resets and sessionStorage is still unlearned
    rerender(
      <StorefrontMotionConfig>
        <PileProvider>
          <CrateView crates={crates} activeSlug="rock" onSelectCrate={vi.fn()} onBack={vi.fn()} />
        </PileProvider>
      </StorefrontMotionConfig>
    )

    expect(screen.getByText(GHOST_FINGER_CUE_COPY)).toBeInTheDocument()
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
    const next = screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })
    next.click()

    const updatedImages = container.querySelectorAll<HTMLImageElement>("img")
    const nextBackdrop = Array.from(updatedImages).find((img) => img.getAttribute("src") === "/thumb2.jpg")
    expect(nextBackdrop).toBeTruthy()
  })

  it("keeps background records mounted while their depth positions animate", async () => {
    const user = userEvent.setup()
    const cratesWithThumbnails: Crate[] = [
      {
        slug: "jazz",
        name: "Jazz",
        count: 4,
        records: [
          makeListing({ id: 1, title: "First", artist: "A", thumbnail_url: "/first-thumb.jpg" }),
          makeListing({ id: 2, title: "Second", artist: "B", thumbnail_url: "/second-thumb.jpg" }),
          makeListing({ id: 3, title: "Third", artist: "C", thumbnail_url: "/third-thumb.jpg" }),
          makeListing({ id: 4, title: "Fourth", artist: "D", thumbnail_url: "/fourth-thumb.jpg" }),
        ],
      },
    ]

    const { container } = renderCrateView("compact", { crates: cratesWithThumbnails, activeSlug: "jazz" })
    const thirdHintImage = container.querySelector<HTMLImageElement>('img[src="/third-thumb.jpg"]')
    const thirdHintCard = thirdHintImage?.closest("[data-riffle-slot]")

    expect(thirdHintImage).toBeTruthy()
    expect(thirdHintCard).toHaveAttribute("data-riffle-slot", "2")

    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))

    const movedThirdHintImage = container.querySelector<HTMLImageElement>('img[src="/third-thumb.jpg"]')
    const movedThirdHintCard = movedThirdHintImage?.closest("[data-riffle-slot]")

    expect(movedThirdHintImage).toBe(thirdHintImage)
    expect(movedThirdHintCard).toBe(thirdHintCard)
    expect(movedThirdHintCard).toHaveAttribute("data-riffle-slot", "1")
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
    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))
    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))

    expect(screen.getByRole("progressbar", { name: "Record 3 of 3, front to deeper" })).toBeInTheDocument()
  })

  it("ArrowDown advances deeper and ArrowUp returns toward the front", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    await user.keyboard("{ArrowDown}")
    expect(screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" })).toBeInTheDocument()

    await user.keyboard("{ArrowUp}")
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
  })

  it("navigates deeper and front with the semantic button labels", async () => {
    const user = userEvent.setup()

    renderCrateView("compact")

    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))
    expect(screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front }))

    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
  })

  it("keeps navigation decisions unchanged when reduced motion is requested", async () => {
    const user = userEvent.setup()
    const originalMatchMedia = window.matchMedia

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    try {
      renderCrateView("compact")

      await user.click(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper }))

      expect(screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" })).toBeInTheDocument()
    } finally {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: originalMatchMedia,
      })
    }
  })

  it("renders the active drag surface that delegates release decisions to the riffle contract", () => {
    renderCrateView("compact")

    expect(screen.getByTestId("crate-drag-surface")).toBeInTheDocument()
  })

  // ── First-swipe lesson cue (U2) ────────────────────────────

  it("shows the ghost-finger lesson cue on compact populated first render", () => {
    renderCrateView("compact")

    expect(screen.getByText(GHOST_FINGER_CUE_COPY)).toBeInTheDocument()
    // Core controls still present
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.deeper })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: RIFFLE_LANGUAGE.controls.front })).toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" })).toBeInTheDocument()
  })

  it("does not show the first-swipe lesson cue on wide tier", () => {
    renderCrateView("wide")

    expect(screen.queryByText(GHOST_FINGER_CUE_COPY)).not.toBeInTheDocument()
  })

  it("does not show the first-swipe lesson cue on comfy tier", () => {
    renderCrateView("comfy")

    expect(screen.queryByText(GHOST_FINGER_CUE_COPY)).not.toBeInTheDocument()
  })

  it("does not show the first-swipe lesson cue on compact empty crate", () => {
    const emptyCrates: Crate[] = [
      { slug: "empty", name: "Empty Crate", count: 0, records: [] },
    ]

    renderCrateView("compact", { crates: emptyCrates, activeSlug: "empty" })

    expect(screen.queryByText(GHOST_FINGER_CUE_COPY)).not.toBeInTheDocument()
    expect(screen.queryByText("Pull down")).not.toBeInTheDocument()
  })

  it("shows the lesson cue on compact hideTabs when populated", () => {
    renderCrateView("compact", { hideTabs: true })

    expect(screen.getByText(GHOST_FINGER_CUE_COPY)).toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument()
  })

  it("does not show the lesson cue on wide hideTabs", () => {
    renderCrateView("wide", { hideTabs: true })

    expect(screen.queryByText(GHOST_FINGER_CUE_COPY)).not.toBeInTheDocument()
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument()
  })

  it("does not add interactive controls in the lesson cue area", () => {
    renderCrateView("compact")

    // The lesson cue should be decorative / status-like, not an interactive element
    const cueEl = screen.getByText(GHOST_FINGER_CUE_COPY)
    // Verify it's not a button, link, or input
    expect(cueEl.tagName).toBe("P")
    // The parent container is aria-hidden so screen readers skip it
    expect(cueEl.parentElement).toHaveAttribute("aria-hidden", "true")
  })
})

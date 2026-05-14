import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import StoreFloor from "./store_floor"
import StorefrontMotionConfig from "./storefront_motion_config"
import { PileProvider } from "@/contexts/pile_context"
import { ViewportProvider } from "@/contexts/viewport_context"
import { renderWithTier } from "@/test/viewport-test-utils"
import type { Listing, StorefrontSection } from "../types/inertia"

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

describe("storefront shell (StoreFloor with sections)", () => {
  const renderStore = (ui: React.ReactElement) =>
    render(
      <StorefrontMotionConfig>
        <ViewportProvider>
          <PileProvider>{ui}</PileProvider>
        </ViewportProvider>
      </StorefrontMotionConfig>,
    )
  it("renders picks wall section first with stronger header", async () => {
    const onSelectCrate = vi.fn()
    const sections: StorefrontSection[] = [
      {
        key: "picks_wall",
        crate: {
          slug: "picks",
          name: "Milkcrate Picks",
          count: 12,
          records: [
            makeListing({ id: 1, title: "Record 1" }),
            makeListing({ id: 2, title: "Record 2" }),
          ],
        },
      },
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    const picksHeader = screen.getByText("Milkcrate Picks")
    expect(picksHeader).toBeInTheDocument()
    expect(picksHeader.className).toContain("font-semibold")
  })

  it("opens picks crate when picks header is clicked", async () => {
    const onSelectCrate = vi.fn()
    const user = userEvent.setup()
    const sections: StorefrontSection[] = [
      {
        key: "picks_wall",
        crate: {
          slug: "picks",
          name: "Milkcrate Picks",
          count: 1,
          records: [makeListing({ id: 1, title: "Pick 1" })],
        },
      },
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    const button = screen.getByRole("button", { name: "Open Milkcrate Picks" })
    await user.click(button)

    expect(onSelectCrate).toHaveBeenCalledWith("picks")
  })

  it("renders desktop wall cards via TactileCard when viewport is comfy", async () => {
    const onSelectCrate = vi.fn()
    const sections: StorefrontSection[] = [
      {
        key: "picks_wall",
        crate: {
          slug: "picks",
          name: "Milkcrate Picks",
          count: 12,
          records: [
            makeListing({ id: 1, title: "Record 1" }),
            makeListing({ id: 2, title: "Record 2" }),
          ],
        },
      },
      { key: "genre_grid", crates: [] },
    ]

    renderWithTier("comfy", (
      <StorefrontMotionConfig>
        <PileProvider>
          <StoreFloor sections={sections} onSelectCrate={onSelectCrate} />
        </PileProvider>
      </StorefrontMotionConfig>
    ))

    // TactileCard renders children inside a motion.div — the RecordTile
    // content should be reachable via the accessible name on the wrapper
    expect(screen.getByRole("button", { name: "Open Milkcrate Picks at Record 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Open Milkcrate Picks at Record 2" })).toBeInTheDocument()
  })

  it("renders featured crates row when present", async () => {
    const onSelectCrate = vi.fn()
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
            count: 4,
            records: [
              makeListing({ id: 3, title: "Theme 1" }),
              makeListing({ id: 4, title: "Theme 2" }),
            ],
          },
        ],
      },
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    expect(screen.getByText("New Arrivals")).toBeInTheDocument()
    expect(screen.getByText("This Week's Theme")).toBeInTheDocument()
  })

  it("opens featured crate when card is clicked", async () => {
    const onSelectCrate = vi.fn()
    const user = userEvent.setup()
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
      {
        key: "featured_crates",
        crates: [
          {
            slug: "new-arrivals",
            name: "New Arrivals",
            count: 1,
            records: [makeListing({ id: 1, title: "New" })],
          },
        ],
      },
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    const button = screen.getByRole("button", { name: "Open New Arrivals" })
    await user.click(button)

    expect(onSelectCrate).toHaveBeenCalledWith("new-arrivals")
  })

  it("renders genre grid sections as separate lanes", async () => {
    const onSelectCrate = vi.fn()
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
      {
        key: "genre_grid",
        crates: [
          {
            slug: "jazz",
            name: "Jazz",
            count: 5,
            records: [makeListing({ id: 1, title: "Jazz 1" })],
          },
          {
            slug: "rock",
            name: "Rock",
            count: 8,
            records: [makeListing({ id: 2, title: "Rock 1" })],
          },
        ],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    expect(screen.getByText("Jazz")).toBeInTheDocument()
    expect(screen.getByText("Rock")).toBeInTheDocument()
  })

  it("opens genre crate at correct record index when thumbnail clicked", async () => {
    const onSelectCrate = vi.fn()
    const user = userEvent.setup()
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
      {
        key: "genre_grid",
        crates: [
          {
            slug: "jazz",
            name: "Jazz",
            count: 2,
            records: [
              makeListing({ id: 1, title: "Jazz 1" }),
              makeListing({ id: 2, title: "Jazz 2" }),
            ],
          },
        ],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    const button = screen.getByRole("button", { name: "Open Jazz at Jazz 2" })
    await user.click(button)

    expect(onSelectCrate).toHaveBeenCalledWith("jazz", 1)
  })

  it("opens genre crate when card body clicked", async () => {
    const onSelectCrate = vi.fn()
    const user = userEvent.setup()
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
      {
        key: "genre_grid",
        crates: [
          {
            slug: "jazz",
            name: "Jazz",
            count: 1,
            records: [makeListing({ id: 1, title: "Jazz 1" })],
          },
        ],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    const button = screen.getByRole("button", { name: "Open Jazz" })
    await user.click(button)

    expect(onSelectCrate).toHaveBeenCalledWith("jazz")
  })

  it("does not render the genre grid when no crates exist", async () => {
    const onSelectCrate = vi.fn()
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
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    expect(screen.queryByText("No genre crates available yet.")).not.toBeInTheDocument()
  })

  it("does not render featured row when featured_crates section absent", async () => {
    const onSelectCrate = vi.fn()
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
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    expect(screen.queryByText("New Arrivals")).not.toBeInTheDocument()
    expect(screen.queryByText("This Week's Theme")).not.toBeInTheDocument()
  })

  it("does not render picks section when picks crate has no records", async () => {
    const onSelectCrate = vi.fn()
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
      {
        key: "genre_grid",
        crates: [],
      },
    ]

    renderStore(<StoreFloor sections={sections} onSelectCrate={onSelectCrate} />)

    expect(screen.queryByText("Milkcrate Picks")).not.toBeInTheDocument()
  })
})

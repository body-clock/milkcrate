import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import Home from "../../pages/home"
import { renderWithTier } from "../viewport-test-utils"
import type { HomepagePreview, Listing } from "../../types/inertia"

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
  useForm: () => ({
    data: {
      name: "",
      discogs_username: "",
      email: "",
      inventory_size: "",
      notes: "",
      turnstile_token: "",
    },
    setData: vi.fn(),
    post: vi.fn(),
    processing: false,
  }),
  usePage: () => ({
    props: {} as Record<string, unknown>,
  }),
}))

const copy = {
  hero: {
    headline: "Browse a Discogs seller like a record store.",
    subhead:
      "Milkcrate turns a seller's Discogs inventory into crates, picks, and bins made for digging.",
    cta_demo: "Visit the demo store",
    cta_apply: "Request a storefront",
    footnote: "Discogs stays the source of inventory and checkout.",
    preview_label: "Storefront lobby",
    fallback_title: "Start with the demo store.",
    fallback_body:
      "Open Philadelphia Music to see crates, picks, bins, and the Discogs checkout path in context.",
  },
  marketplace_loop: {
    title: "The loop works because buyers get the better room.",
    items: [
      {
        title: "Buyers dig through crates",
        body: "Start with picks, then move through bins that feel closer to a shop than a spreadsheet.",
      },
      {
        title: "Stores share one front door",
        body: "A Milkcrate link gives regulars and fair visitors a warmer way into existing Discogs stock.",
      },
      {
        title: "Discogs still handles checkout",
        body: "Listings, availability, and purchases stay grounded in the seller's Discogs workflow.",
      },
    ],
  },
  seller_path: {
    title: "Have a Discogs shop worth browsing?",
    body: "Tell us your username. We are onboarding storefronts carefully while the beta stays hands-on.",
    cta: "Request a storefront",
  },
  store_character: {
    title: "A storefront with record-store shape.",
    moments: [
      {
        title: "Milkcrate Picks",
        body: "A front wall of records gives buyers a place to start.",
      },
      {
        title: "Featured Crates",
        body: "Focused sections make a large inventory easier to enter.",
      },
      {
        title: "Genre Bins",
        body: "Familiar bins keep the browse moving without burying the records.",
      },
      {
        title: "Build a Pile",
        body: "Buyers can compare finds before heading back to Discogs.",
      },
      {
        title: "Store Character",
        body: "Future premium surfaces can make storefronts feel more like the seller behind them.",
      },
    ],
  },
  record_fair: {
    title: "Bring the store back from the record fair.",
    body: "A Milkcrate link gives table traffic a way to keep browsing after the room closes.",
  },
  final_cta: {
    body: "We are onboarding stores one at a time. Send your Discogs username and we will review it for beta access.",
    cta: "Request a storefront",
  },
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 1,
    discogs_listing_id: "abc",
    artist: "Artist",
    title: "Record",
    label: null,
    year: null,
    format: null,
    genres: [],
    styles: [],
    condition: null,
    price: "10.00",
    currency: "USD",
    cover_image_url: "/covers/record.jpg",
    thumbnail_url: null,
    notes: null,
    discogs_url: "https://www.discogs.com/sell/item/1",
    ...overrides,
  }
}

function makePreview(overrides: Partial<HomepagePreview> = {}): HomepagePreview {
  return {
    store_name: "Philadelphia Music",
    store_slug: "philadelphiamusic",
    sections: [],
    ...overrides,
  }
}

function makePreviewWithPicks(records: Listing[] = [makeListing()]): HomepagePreview {
  return makePreview({
    sections: [
      {
        key: "picks_wall",
        crate: {
          slug: "picks",
          name: "Milkcrate Picks",
          count: records.length,
          records,
        },
      },
    ],
  })
}

const decorativeGlyphs = ["🥛", "📀", "👀", "📦"]

describe("Home page - buyer-led storefront lobby", () => {
  describe("hero section", () => {
    it("renders a buyer-led H1 heading", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(
        screen.getByRole("heading", { name: copy.hero.headline })
      ).toBeInTheDocument()
    })

    it("does not render the old seller-first headline or em dash copy", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const pageText = document.body.textContent ?? ""
      expect(pageText).not.toContain("Your Discogs inventory, now a storefront")
      expect(pageText).not.toContain("—")
    })

    it("keeps the demo and seller CTAs routed", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByRole("link", { name: copy.hero.cta_demo })).toHaveAttribute("href", "/philadelphiamusic")
      expect(screen.getAllByRole("link", { name: copy.hero.cta_apply })[0]).toHaveAttribute("href", "/apply")
    })

    it("falls back to the demo route when no preview slug is present", () => {
      render(<Home copy={copy} preview={makePreview({ store_slug: null })} />)

      expect(screen.getByRole("link", { name: copy.hero.cta_demo })).toHaveAttribute("href", "/philadelphiamusic")
    })

    it("renders the Discogs checkout footnote", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.hero.footnote)).toBeInTheDocument()
    })
  })

  describe("storefront lobby proof", () => {
    it("renders product-native crate proof when picks data is present", () => {
      renderWithTier("wide", <Home copy={copy} preview={makePreviewWithPicks()} />)

      expect(screen.getByText(copy.hero.preview_label)).toBeInTheDocument()
      expect(screen.getAllByText("Milkcrate Picks").length).toBeGreaterThanOrEqual(1)
    })

    it("renders an intentional fallback lobby when preview sections are empty", () => {
      render(<Home copy={copy} preview={makePreview({ sections: [] })} />)

      expect(screen.getByText(copy.hero.preview_label)).toBeInTheDocument()
      expect(screen.getByText(copy.hero.fallback_title)).toBeInTheDocument()
      expect(screen.getByRole("link", { name: /Open the demo storefront/i })).toHaveAttribute("href", "/philadelphiamusic")
    })

    it("renders a one-record preview without crashing", () => {
      const preview = makePreviewWithPicks([makeListing({ id: 7, title: "Single Pick" })])

      renderWithTier("compact", <Home copy={copy} preview={preview} />)

      expect(screen.getAllByText("Milkcrate Picks").length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText("1 record")).toBeInTheDocument()
    })
  })

  describe("marketplace loop and seller path", () => {
    it("renders buyers, stores, and Discogs in one loop", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByRole("heading", { name: copy.marketplace_loop.title })).toBeInTheDocument()
      for (const item of copy.marketplace_loop.items) {
        expect(screen.getByText(item.title)).toBeInTheDocument()
        expect(screen.getByText(item.body)).toBeInTheDocument()
      }
    })

    it("includes a beta-safe seller route to /apply", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.seller_path.body)).toBeInTheDocument()
      expect(screen.getAllByRole("link", { name: copy.seller_path.cta })[0]).toHaveAttribute("href", "/apply")
      expect(document.body.textContent).not.toMatch(/instant|self-serve setup/i)
    })

    it("removes the old onboarding mechanics", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.queryByText("Share your Discogs")).not.toBeInTheDocument()
      expect(screen.queryByText("We sync & curate")).not.toBeInTheDocument()
      expect(screen.queryByText("Share your store")).not.toBeInTheDocument()
    })
  })

  describe("store character section", () => {
    it("renders product-native store moments", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByRole("heading", { name: copy.store_character.title })).toBeInTheDocument()
      for (const moment of copy.store_character.moments) {
        expect(screen.getByText(moment.title)).toBeInTheDocument()
        expect(screen.getByText(moment.body)).toBeInTheDocument()
      }
    })

    it("does not render unsupported feature-card claims", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const text = document.body.textContent ?? ""
      expect(text).not.toMatch(/One click sends everything to their Discogs cart/i)
      expect(text).not.toMatch(/Spotlight the crates you want customers to see first/i)
      expect(text).not.toMatch(/manual crate spotlighting/i)
      expect(text).not.toMatch(/shipped customization controls/i)
    })
  })

  describe("record-fair and final CTA", () => {
    it("keeps record-fair copy as a supporting callout", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.record_fair.title)).toBeInTheDocument()
      expect(screen.getByText(copy.record_fair.body)).toBeInTheDocument()
    })

    it("renders the final seller CTA", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getByText(copy.final_cta.body)).toBeInTheDocument()
      expect(screen.getAllByRole("link", { name: copy.final_cta.cta }).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("responsive rendering and accessibility", () => {
    it.each(["compact", "comfy", "wide"] as const)("renders at %s tier", (tier) => {
      const { container } = renderWithTier(
        tier,
        <Home copy={copy} preview={makePreviewWithPicks()} />
      )

      expect(container).toBeInTheDocument()
      expect(screen.getByRole("heading", { level: 1, name: copy.hero.headline })).toBeInTheDocument()
      expect(screen.getAllByRole("link", { name: copy.hero.cta_apply }).length).toBeGreaterThanOrEqual(1)
    })

    it("keeps the H1 as the first page heading", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      expect(screen.getAllByRole("heading")[0]).toHaveTextContent(copy.hero.headline)
    })

    it("does not render decorative emoji glyphs", () => {
      render(<Home copy={copy} preview={makePreview()} />)

      const text = document.body.textContent ?? ""
      for (const glyph of decorativeGlyphs) {
        expect(text).not.toContain(glyph)
      }
    })
  })
})

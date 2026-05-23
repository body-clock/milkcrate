import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import StorefrontMotionConfig from "@/components/storefront_motion_config"
import HomeStorefrontLobby from "./home_storefront_lobby"
import type { HomepagePreview, Listing } from "@/types/inertia"

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const copy = {
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

function renderLobby(preview: HomepagePreview) {
  return render(
    <StorefrontMotionConfig>
      <HomeStorefrontLobby copy={copy} preview={preview} />
    </StorefrontMotionConfig>
  )
}

describe("HomeStorefrontLobby", () => {
  it("renders the buyer-led heading and both routes", () => {
    renderLobby(makePreview())

    expect(screen.getByRole("heading", { level: 1, name: copy.headline })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: copy.cta_demo })).toHaveAttribute("href", "/philadelphiamusic")
    expect(screen.getByRole("link", { name: copy.cta_apply })).toHaveAttribute("href", "/apply")
  })

  it("uses the preview store slug for the demo CTA when present", () => {
    renderLobby(makePreview({ store_slug: "demo-records" }))

    expect(screen.getByRole("link", { name: copy.cta_demo })).toHaveAttribute("href", "/demo-records")
    expect(screen.getByRole("link", { name: /Open the demo storefront/i })).toHaveAttribute("href", "/demo-records")
  })

  it("renders picks-wall crate proof when preview data is present", () => {
    renderLobby(makePreview({
      sections: [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 2,
            records: [
              makeListing({ id: 1 }),
              makeListing({ id: 2, discogs_listing_id: "def", title: "Second Record" }),
            ],
          },
        },
      ],
    }))

    expect(screen.getByText(copy.preview_label)).toBeInTheDocument()
    expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
    expect(screen.getByText("2 records")).toBeInTheDocument()
  })

  it("renders an intentional fallback when preview data is empty", () => {
    renderLobby(makePreview({ store_slug: null, sections: [] }))

    expect(screen.getByText(copy.fallback_title)).toBeInTheDocument()
    expect(screen.getByText(copy.fallback_body)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Open the demo storefront/i })).toHaveAttribute("href", "/philadelphiamusic")
  })
})

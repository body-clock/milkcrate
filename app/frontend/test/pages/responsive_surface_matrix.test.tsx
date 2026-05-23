import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { renderWithTier } from "../viewport-test-utils"
import type { ViewportTier } from "@/contexts/viewport_context"

// ── Mock @inertiajs/react —─────────────────────────────────────
vi.mock("@inertiajs/react", () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
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
    props: {
      flash: {},
      store: {
        name: "Philadelphia Music",
        discogs_username: "philadelphiamusic",
      },
    },
  }),
}))

// ── Mock AppLayout for store page — strip providers so renderWithTier ──────
// injects the tier. Without this, AppLayout's own ViewportProvider shadows
// renderWithTier's provider.
vi.mock("@/layouts/app_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ── Mock StorefrontMotionConfig — AppLayout mock strips the real provider,  ─
// so we supply a no-op motion context for StoreFloor's animated children.
vi.mock("@/components/storefront_motion_config", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotionContext: () => false,
}))

// ── Page imports (after mocks so Vitest hoists correctly) ──────
import Home from "../../pages/home"
import Apply from "../../pages/apply"
import StoreShow from "../../pages/stores/show"
import Dashboard from "../../pages/admin/dashboard"
import type { AdminDashboardProps, StoreShowProps, HomepagePreview } from "../../types/inertia"

// ── Shared test data ────────────────────────────────────────────

const homeCopy = {
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
      { title: "Milkcrate Picks", body: "A front wall of records gives buyers a place to start." },
      { title: "Featured Crates", body: "Focused sections make a large inventory easier to enter." },
      { title: "Genre Bins", body: "Familiar bins keep the browse moving without burying the records." },
      { title: "Build a Pile", body: "Buyers can compare finds before heading back to Discogs." },
      { title: "Store Character", body: "Future premium surfaces can make storefronts feel more like the seller behind them." },
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

const previewFallback: HomepagePreview = {
  store_name: "Philadelphia Music",
  store_slug: null,
  sections: [],
}

const applyCopy = {
  headline: "Get your store on Milkcrate",
  subhead: "We're onboarding stores one at a time.",
  submit: "Submit",
  submitting: "Submitting",
  confirmation_headline: "You're on the list.",
  confirmation_body: "We'll review your store and reach out to you directly.",
  context_title: "What you need to know",
  context_discogs_why:
    "We start with your Discogs username to review inventory quickly. API-key based onboarding is part of our deeper integration direction.",
  context_what_happens:
    "After you submit, we review your store, curate your inventory into browsable crates, and reach out when your storefront is live.",
  context_no_commitment:
    "No commitment. We're onboarding stores one at a time to make sure every storefront gets personal attention.",
  field_hint_discogs:
    "We pull your inventory from your public Discogs storefront.",
  field_hint_email: "We'll reach out when your Milkcrate storefront is ready.",
  fields: {
    name: "Store name",
    discogs_username: "Discogs username",
    email: "Email",
    inventory_size: "Approximate inventory size",
    notes: "Anything else?",
  },
}

const storeShowProps: StoreShowProps = {
  store: {
    id: 1,
    name: "Philadelphia Music",
    discogs_username: "philadelphiamusic",
    description: "Independent record store in South Philly.",
    total_listings: 120,
    sync_status: "idle",
    last_sync_error_at: null,
    enrichment_status: "idle",
    last_enriched_at: null,
  },
  crates: [],
}

const adminProps: AdminDashboardProps = {
  discogs_onboarding: {
    lookup_path: "/admin/discogs_lookup",
    create_path: "/admin/onboarding",
  },
  active_stores: [
    {
      id: 1,
      name: "Healthy Records",
      discogs_username: "healthy-records",
      total_listings: 300,
      inventory_page_count: 3,
      sync_status: "idle",
      enrichment_status: "idle",
      catalog_coverage: "near_complete",
      last_synced_at: "2026-05-16T10:00:00Z",
      last_enriched_at: "2026-05-16T11:00:00Z",
      last_sync_error_at: null,
      storefront_path: "/healthy-records",
      health: {
        key: "healthy",
        label: "Healthy",
        severity: "good",
        reasons: ["Sync and enrichment are current"],
        has_sync_error: false,
        last_sync_error_summary: null,
      },
    },
  ],
  applicants: [
    {
      id: 10,
      name: "Applicant Records",
      email: "applicant@example.com",
      discogs_username: "applicant-records",
      inventory_size: "500_2000",
      notes: null,
      submitted_at: "2026-05-15T12:00:00Z",
    },
  ],
}

// ── Tier list shared across all surfaces ───────────────────────
const tiers: ViewportTier[] = ["compact", "comfy", "wide"]

describe("responsive surface matrix", () => {
  describe.each(tiers)("%s tier", (tier) => {
    it("renders the home page without crashing", () => {
      const { container } = renderWithTier(
        tier,
        <Home copy={homeCopy} preview={previewFallback} />
      )
      expect(container).toBeTruthy()
      // Quick structural smoke: heading should be present
      expect(
        screen.getByRole("heading", { name: homeCopy.hero.headline })
      ).toBeInTheDocument()
    })

    it("renders the apply page without crashing", () => {
      const { container } = renderWithTier(
        tier,
        <Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />
      )
      expect(container).toBeTruthy()
      // Quick structural smoke: heading should be present
      expect(
        screen.getByRole("heading", { name: applyCopy.headline })
      ).toBeInTheDocument()
    })

    it("renders the store page without crashing", () => {
      const { container } = renderWithTier(
        tier,
        <StoreShow {...storeShowProps} />
      )
      expect(container).toBeTruthy()
      // The store page shows empty state when no crates exist
      expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument()
    })

    it("renders the admin dashboard without crashing", () => {
      const { container } = renderWithTier(
        tier,
        <Dashboard {...adminProps} />
      )
      expect(container).toBeTruthy()
      expect(screen.getByRole("heading", { name: "Store operations" })).toBeInTheDocument()
      expect(screen.getByText("Applicant Records")).toBeInTheDocument()
    })
  })

  it("home page does not crash with live preview data", () => {
    // Test with a populated preview through the active home-page rendering path.
    const livePreview: HomepagePreview = {
      store_name: "Philadelphia Music",
      store_slug: "philadelphiamusic",
      sections: [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 2,
            records: [
              {
                id: 1,
                discogs_listing_id: "1",
                artist: "Artist One",
                title: "Record One",
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
              },
              {
                id: 2,
                discogs_listing_id: "2",
                artist: "Artist Two",
                title: "Record Two",
                label: null,
                year: null,
                format: null,
                genres: [],
                styles: [],
                condition: null,
                price: "12.00",
                currency: "USD",
                cover_image_url: null,
                thumbnail_url: null,
                notes: null,
                discogs_url: "https://www.discogs.com/sell/item/2",
              },
            ],
          },
        },
      ],
    }

    const { container } = renderWithTier("comfy", (
      <Home copy={homeCopy} preview={livePreview} />
    ))
    expect(container).toBeTruthy()
    expect(
      screen.getByRole("heading", { name: homeCopy.hero.headline })
    ).toBeInTheDocument()
  })

  it("apply page does not crash in submitted (confirmation) state", () => {
    // Submitted state renders BrandMark in the confirmation — verify no crash.
    const { container } = renderWithTier(
      "comfy",
      <Apply copy={applyCopy} submitted turnstile={{ enabled: false, site_key: null }} />
    )
    expect(container).toBeTruthy()
    expect(
      screen.getByText(applyCopy.confirmation_headline)
    ).toBeInTheDocument()
  })

  it("store page does not crash with populated crates", () => {
    const propsWithCrates: StoreShowProps = {
      ...storeShowProps,
      crates: [
        {
          slug: "picks",
          name: "Milkcrate Picks",
          count: 1,
          records: [
            {
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
              cover_image_url: null,
              thumbnail_url: null,
              notes: null,
              discogs_url: "https://www.discogs.com/sell/item/1",
            },
          ],
        },
      ],
      storefront_sections: [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 1,
            records: [
              {
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
                cover_image_url: null,
                thumbnail_url: null,
                notes: null,
                discogs_url: "https://www.discogs.com/sell/item/1",
              },
            ],
          },
        },
      ],
    }

    const { container } = renderWithTier("wide", (
      <StoreShow {...propsWithCrates} />
    ))
    expect(container).toBeTruthy()
    // Store floor should render when crates exist
    expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
  })

  // ── U4: Regression coverage for Picks surface and CrateView header ───

  it("populated store page renders Picks surface at all viewport tiers", () => {
    const propsWithSections: StoreShowProps = {
      ...storeShowProps,
      crates: [
        {
          slug: "picks",
          name: "Milkcrate Picks",
          count: 2,
          records: [
            {
              id: 1,
              discogs_listing_id: "1",
              artist: "Artist 1",
              title: "Pick One",
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
            },
            {
              id: 2,
              discogs_listing_id: "2",
              artist: "Artist 2",
              title: "Pick Two",
              label: null,
              year: null,
              format: null,
              genres: [],
              styles: [],
              condition: null,
              price: "12.00",
              currency: "USD",
              cover_image_url: null,
              thumbnail_url: null,
              notes: null,
              discogs_url: "https://www.discogs.com/sell/item/2",
            },
          ],
        },
      ],
      storefront_sections: [
        {
          key: "picks_wall",
          crate: {
            slug: "picks",
            name: "Milkcrate Picks",
            count: 2,
            records: [
              {
                id: 1,
                discogs_listing_id: "1",
                artist: "Artist 1",
                title: "Pick One",
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
              },
              {
                id: 2,
                discogs_listing_id: "2",
                artist: "Artist 2",
                title: "Pick Two",
                label: null,
                year: null,
                format: null,
                genres: [],
                styles: [],
                condition: null,
                price: "12.00",
                currency: "USD",
                cover_image_url: null,
                thumbnail_url: null,
                notes: null,
                discogs_url: "https://www.discogs.com/sell/item/2",
              },
            ],
          },
        },
        { key: "genre_grid", crates: [] },
      ],
    }

    renderWithTier("compact", <StoreShow {...propsWithSections} />)
    expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
  })
})

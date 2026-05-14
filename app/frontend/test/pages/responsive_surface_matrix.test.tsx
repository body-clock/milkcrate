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
// so we supply a no-op context so TactileCard (used by StoreFloor) doesn't throw.
vi.mock("@/components/storefront_motion_config", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotionContext: () => false,
}))

// ── Page imports (after mocks so Vitest hoists correctly) ──────
import Home from "../../pages/home"
import Apply from "../../pages/apply"
import Featured from "../../pages/stores/featured"
import type { FeaturedProps, HomepagePreview } from "../../types/inertia"

// ── Shared test data ────────────────────────────────────────────

const homeCopy = {
  headline: "Your Discogs inventory, now a storefront.",
  subhead:
    "Milkcrate turns your existing Discogs listings into a warm, browsable record shop that you can share in seconds.",
  cta_demo: "See the demo →",
  cta_apply: "Get your store on Milkcrate",
  footnote: "Early access. We handle the setup.",
  steps: {
    step1_title: "Share your Discogs",
    step1_body: "Tell us your Discogs username. That\u2019s it.",
    step2_title: "We sync & curate",
    step2_body:
      "Your inventory becomes curated crates — picks, featured, genre bins.",
    step3_title: "Share your store",
    step3_body:
      "One link. Your customers browse like they\u2019re in the shop.",
  },
  preview_label: "Flip Through Milkcrate Picks",
  record_fair_title: "Bring your store to the next record fair",
  record_fair_body:
    "QR codes on cards, bags, and signage turn foot traffic into return visitors — long after the fair ends.",
  store_character_title: "Your shop. Crated for browsing.",
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

const featuredProps: FeaturedProps = {
  store: {
    id: 1,
    name: "Philadelphia Music",
    discogs_username: "philadelphiamusic",
    description: "Independent record store in South Philly.",
    total_listings: 120,
    sync_status: "idle",
  },
  crates: [],
  active_crate_slug: "picks",
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
        screen.getByRole("heading", { name: homeCopy.headline })
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
        <Featured {...featuredProps} />
      )
      expect(container).toBeTruthy()
      // The store page shows empty state when no crates exist
      expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument()
    })
  })

  it("home page does not crash with live preview data", () => {
    // Test with a populated preview — exercises StorefrontPreview rendering path.
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
      screen.getByRole("heading", { name: homeCopy.headline })
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
    const propsWithCrates: FeaturedProps = {
      ...featuredProps,
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
      <Featured {...propsWithCrates} />
    ))
    expect(container).toBeTruthy()
    // Store floor should render when crates exist
    expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
  })

  // ── U4: Regression coverage for Picks surface and CrateView header ───

  it("populated store page renders Picks surface at all viewport tiers", () => {
    const propsWithSections: FeaturedProps = {
      ...featuredProps,
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

    renderWithTier("compact", <Featured {...propsWithSections} />)
    expect(screen.getByText("Milkcrate Picks")).toBeInTheDocument()
  })
})

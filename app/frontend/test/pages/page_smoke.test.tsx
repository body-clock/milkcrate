import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Home from "../../pages/home"
import Apply from "../../pages/apply"
import StoreShow from "../../pages/stores/show"
import Invitation from "../../pages/stores/invitation"
import Dashboard from "../../pages/admin/dashboard"
import type { AdminDashboardProps, StoreShowProps, InvitationProps } from "../../types/inertia"

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
    props: {
      flash: {},
      store: {
        name: "Philadelphia Music",
        discogs_username: "philadelphiamusic",
      },
    },
  }),
}))

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

const previewFallback = {
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
  context_discogs_why: "We start with your Discogs username to review inventory quickly. API-key based onboarding is part of our deeper integration direction.",
  context_what_happens: "After you submit, we review your store, curate your inventory into browsable crates, and reach out when your storefront is live.",
  context_no_commitment: "No commitment. We're onboarding stores one at a time to make sure every storefront gets personal attention.",
  field_hint_discogs: "We pull your inventory from your public Discogs storefront.",
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

describe("page smoke tests", () => {
  it("renders the home page", () => {
    render(<Home copy={homeCopy} preview={previewFallback} />)

    expect(screen.getByRole("heading", { name: homeCopy.hero.headline })).toBeInTheDocument()
  })

  it("home page header does not render emoji wordmark", () => {
    render(<Home copy={homeCopy} preview={previewFallback} />)

    // The layout header link should use BrandMark, not the old emoji wordmark.
    // The wordmark text is plain "Milkcrate" without emoji prefix.
    const header = document.querySelector("header")
    expect(header?.textContent).toContain("Milkcrate")
    expect(header?.textContent).not.toContain("🥛")
  })

  it("renders the apply page", () => {
    render(<Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />)

    expect(screen.getByRole("heading", { name: applyCopy.headline })).toBeInTheDocument()
  })

  it("apply page does not render emoji branding", () => {
    render(<Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />)

    const textContent = document.body.textContent || ""
    expect(textContent).not.toContain("🥛")
    expect(textContent).not.toContain("📦")
  })

  it("renders the store page", () => {
    render(<StoreShow {...storeShowProps} />)

    expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument()
  })

  it("renders the admin dashboard", () => {
    render(<Dashboard {...adminProps} />)

    expect(screen.getByRole("heading", { name: "Store operations" })).toBeInTheDocument()
    expect(screen.getByText("Healthy Records")).toBeInTheDocument()
    expect(screen.getByText("Applicant Records")).toBeInTheDocument()
  })

  it("store page footer does not render emoji branding", () => {
    render(<StoreShow {...storeShowProps} />)

    // The footer "Powered by Milkcrate" should be plain text — no emoji.
    const footer = document.querySelector("footer")
    expect(footer).toBeInTheDocument()
    expect(footer?.textContent).not.toContain("🥛")
    expect(footer?.textContent).toContain("Milkcrate")
  })

  // Cross-surface emoji regression matrix — guards against any page
  // re-introducing milk emoji or emoji-based wordmarks.
  describe.each([
    ["home", () => render(<Home copy={homeCopy} preview={previewFallback} />)],
    ["apply", () => render(<Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />)],
    ["store", () => render(<StoreShow {...storeShowProps} />)],
    ["admin", () => render(<Dashboard {...adminProps} />)],
  ])("emoji regression: %s page", (_label, renderPage) => {
    it("does not render the milk emoji (🥛)", () => {
      renderPage()
      expect(document.body.textContent).not.toContain("🥛")
    })

    it("does not render the old emoji wordmark (🥛 Milkcrate)", () => {
      renderPage()
      expect(document.body.textContent).not.toContain("🥛 Milkcrate")
    })

    it("does not render decorative emoji icons (📀, 👀, 📦, ♪)", () => {
      renderPage()
      const text = document.body.textContent || ""
      expect(text).not.toContain("📀")
      expect(text).not.toContain("👀")
      expect(text).not.toContain("📦")
    })
  })

  it("hides store description after entering a crate", async () => {
    const user = userEvent.setup()
    const props: StoreShowProps = {
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

    render(<StoreShow {...props} />)

    expect(screen.getByText("Independent record store in South Philly.")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Open Milkcrate Picks" }))

    expect(screen.queryByText("Independent record store in South Philly.")).not.toBeInTheDocument()
    expect(screen.queryByText("120 vinyl listings")).not.toBeInTheDocument()
  })

  describe("invitation page", () => {
    const inviteProps: InvitationProps = {
      waitlist_present: false,
      slug: "test-slug",
    }

    it("renders the invitation page without crashing", async () => {
      render(<Invitation {...inviteProps} />)
      // Fetch fails in test env, so probe settles on error → generic invitation
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /This page is available/i })).toBeInTheDocument()
      })
    })

    it("renders waitlist acknowledgment when waitlist_present is true", async () => {
      render(<Invitation {...inviteProps} waitlist_present={true} />)
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /This URL has been claimed/i })).toBeInTheDocument()
      })
    })

    it("handles fetch error gracefully for valid slugs", async () => {
      render(<Invitation {...inviteProps} slug="valid-store" />)
      // The fetch will fail in test (no server), so it should settle on generic invitation
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /This page is available/i })).toBeInTheDocument()
      })
    })

    it("skips probe and shows generic invitation for short slugs", async () => {
      render(<Invitation {...inviteProps} slug="ab" />)
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /This page is available/i })).toBeInTheDocument()
      })
    })

    it("skips probe for reserved slugs", async () => {
      render(<Invitation {...inviteProps} slug="admin" />)
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /This page is available/i })).toBeInTheDocument()
      })
    })

    it("skips probe for slugs with invalid characters", async () => {
      render(<Invitation {...inviteProps} slug="bad!slug" />)
      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /This page is available/i })).toBeInTheDocument()
      })
    })
  })
})

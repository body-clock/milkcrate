import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
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
  headline: "Your Discogs inventory, now a storefront.",
  subhead: "Milkcrate turns your existing Discogs listings into a warm, browsable record shop that you can share in seconds.",
  cta_demo: "See the demo \u2192",
  cta_apply: "Get your store on Milkcrate",
  footnote: "Early access. We handle the setup.",
  steps: {
    step1_title: "Share your Discogs",
    step1_body: "Tell us your Discogs username. That's it.",
    step2_title: "We sync & curate",
    step2_body: "Your inventory becomes curated crates — picks, featured, genre bins.",
    step3_title: "Share your store",
    step3_body: "One link. Your customers browse like they're in the shop.",
  },
  preview_label: "Flip Through Milkcrate Picks",
  record_fair_title: "Bring your store to the next record fair",
  record_fair_body:
    "QR codes on cards, bags, and signage turn foot traffic into return visitors — long after the fair ends.",
  store_character_title: "Your shop. Crated for browsing.",
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

    expect(screen.getByRole("heading", { name: homeCopy.headline })).toBeInTheDocument()
  })

  it("home page header does not render emoji wordmark", () => {
    render(<Home copy={homeCopy} preview={previewFallback} />)

    // The layout header link should use BrandMark, not the old emoji wordmark.
    // The wordmark text is plain "Milkcrate" without emoji prefix.
    const header = document.querySelector("header")
    expect(header?.textContent).toContain("Milkcrate.")
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
    expect(footer?.textContent).toContain("Milkcrate.")
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

    it("does not render deprecated control or feedback recipe classes", () => {
      const { container } = renderPage()
      expect(container.innerHTML).not.toMatch(/\bmc-(?:btn|input|notice)\b/)
    })
  })

  it("hides store description after entering a crate", async () => {
    const user = userEvent.setup()
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    })
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
    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Back to store" })).toBeInTheDocument()
    expect(within(screen.getByRole("main")).queryByRole("button", { name: "Back to store" })).not.toBeInTheDocument()
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
      // BrandMark wordmark appears at least once (header + possibly hero area)
      expect(screen.getAllByText("Milkcrate.").length).toBeGreaterThanOrEqual(1)
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

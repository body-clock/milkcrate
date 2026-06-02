import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTier } from "../viewport-test-utils";
import type { ViewportTier } from "@/contexts/viewport_context";

// ── Mock @inertiajs/react —─────────────────────────────────────
vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
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
  router: {
    post: vi.fn(),
    visit: vi.fn(),
  },
}));

// ── Mock AppLayout for store page — strip providers so renderWithTier ──────
// injects the tier. Without this, AppLayout's own ViewportProvider shadows
// renderWithTier's provider.
vi.mock("@/layouts/app_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock StorefrontMotionConfig — AppLayout mock strips the real provider,  ─
// so we supply a no-op motion context for StoreFloor's animated children.
vi.mock("@/components/storefront_motion_config", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotionContext: () => false,
}));

// ── Page imports (after mocks so Vitest hoists correctly) ──────
import Home from "../../pages/home";
import Apply from "../../pages/apply";
import StoreShow from "../../pages/stores/show";
import SellerDashboard from "../../pages/dashboard";
import AdminDashboard from "../../pages/admin/dashboard";
import type {
  AdminDashboardProps,
  DashboardProps,
  StoreShowProps,
  HomepagePreview,
  Listing,
} from "../../types/inertia";
import { PileProvider } from "../../contexts/pile_context";

// ── Shared test data ────────────────────────────────────────────

const homeCopy = {
  headline: "Your Discogs inventory, now a storefront.",
  subhead:
    "Milkcrate turns your existing Discogs listings into a warm, browsable record shop that you can share in seconds.",
  cta_demo: "Browse a store →",
  cta_apply: "Get your store on Milkcrate",
  footnote: "Early access. We handle the setup.",
  steps: {
    step1_title: "Share your Discogs",
    step1_body: "Tell us your Discogs username. That\u2019s it.",
    step2_title: "We sync & curate",
    step2_body: "Your inventory becomes browsable crates: picks, featured bins, and genre bins.",
    step3_title: "Share your store",
    step3_body: "One link. Your customers browse like they\u2019re in the shop.",
  },
  preview_blurb: "The longer the store is up, the better the data becomes. Cycles daily.",
  preview_label: "Flip Through Crates",
  record_fair_title: "Bring your store to the next record fair",
  record_fair_body:
    "QR codes on cards, bags, and signage turn foot traffic into return visitors, long after the fair ends.",
  store_character_title: "Your shop. Crated for browsing.",
};

const previewFallback: HomepagePreview = {
  store_name: "Philadelphia Music",
  store_slug: null,
  sections: [],
};

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
  field_hint_discogs: "We pull your inventory from your public Discogs storefront.",
  field_hint_email: "We'll reach out when your Milkcrate storefront is ready.",
  fields: {
    name: "Store name",
    discogs_username: "Discogs username",
    email: "Email",
    inventory_size: "Approximate inventory size",
    notes: "Anything else?",
  },
};

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
};

const makeListing = (id: number, title: string): Listing => ({
  id,
  discogs_listing_id: String(id),
  artist: `Artist ${id}`,
  title,
  label: null,
  year: null,
  format: null,
  genres: [],
  styles: [],
  condition: null,
  price: `${10 + id}.00`,
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: `https://www.discogs.com/sell/item/${id}`,
});

const makeCrate = (
  slug: string,
  name: string,
  recordTitles: string[],
): StoreShowProps["crates"][number] => ({
  slug,
  name,
  count: recordTitles.length,
  records: recordTitles.map((title, index) => makeListing(index + 1, title)),
});

const compactStoreProps: StoreShowProps = {
  ...storeShowProps,
  crates: [
    makeCrate("picks", "Milkcrate Picks", ["Wall One", "Wall Two", "Wall Three"]),
    makeCrate("jazz", "Jazz", ["Jazzy One", "Jazzy Two", "Jazzy Three"]),
    makeCrate("rock", "Rock", ["Rock One", "Rock Two"]),
    makeCrate("soul", "Soul", ["Soul One", "Soul Two"]),
    makeCrate("funk", "Funk", ["Funk One"]),
  ],
  storefront_sections: [
    {
      key: "picks_wall",
      crate: makeCrate("picks", "Milkcrate Picks", ["Wall One", "Wall Two", "Wall Three"]),
    },
    {
      key: "featured_crates",
      crates: [
        makeCrate("jazz", "Jazz", ["Jazzy One", "Jazzy Two", "Jazzy Three"]),
        makeCrate("rock", "Rock", ["Rock One", "Rock Two"]),
      ],
    },
    {
      key: "genre_grid",
      crates: [
        makeCrate("soul", "Soul", ["Soul One", "Soul Two"]),
        makeCrate("funk", "Funk", ["Funk One"]),
      ],
    },
  ],
};

afterEach(() => {
  history.replaceState({}, "", "/stores/test");
});

function renderStoreShowAtTier(tier: ViewportTier, props: StoreShowProps) {
  return renderWithTier(
    tier,
    <PileProvider>
      <StoreShow {...props} />
    </PileProvider>,
  );
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
};

const sellerDashboardProps: DashboardProps = {
  store: {
    id: 2,
    name: "Seller Records",
    discogs_username: "seller-records",
    storefront_url: "/seller-records",
    total_listings: 92,
    sync_status: "idle",
    last_synced_at: "2026-05-16T10:00:00Z",
    last_sync_error_summary: null,
    last_sync_error_at: null,
    oauth_authorized_at: "2026-05-16T09:00:00Z",
  },
};

// ── Tier list shared across all surfaces ───────────────────────
const tiers: ViewportTier[] = ["compact", "comfy", "wide"];

describe("responsive surface matrix", () => {
  describe.each(tiers)("%s tier", (tier) => {
    it("renders the home page without crashing", () => {
      const { container } = renderWithTier(
        tier,
        <Home copy={homeCopy} preview={previewFallback} />,
      );
      expect(container).toBeTruthy();
      // Quick structural smoke: heading should be present
      expect(screen.getByRole("heading", { name: homeCopy.headline })).toBeInTheDocument();
    });

    it("renders the apply page without crashing", () => {
      const { container } = renderWithTier(
        tier,
        <Apply copy={applyCopy} turnstile={{ enabled: false, site_key: null }} />,
      );
      expect(container).toBeTruthy();
      // Quick structural smoke: heading should be present
      expect(screen.getByRole("heading", { name: applyCopy.headline })).toBeInTheDocument();
    });

    it("renders the store page without crashing", () => {
      const { container } = renderStoreShowAtTier(tier, storeShowProps);
      expect(container).toBeTruthy();
      // The store page shows empty state when no crates exist
      expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument();
    });

    it("renders the admin dashboard without crashing", () => {
      const { container } = renderWithTier(tier, <AdminDashboard {...adminProps} />);
      expect(container).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Store operations" })).toBeInTheDocument();
      expect(screen.getByText("Applicant Records")).toBeInTheDocument();
    });

    it("renders the seller dashboard with its operational controls", () => {
      const { container } = renderWithTier(tier, <SellerDashboard {...sellerDashboardProps} />);
      expect(container).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Store Dashboard" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Re-sync inventory" })).toBeInTheDocument();
    });
  });

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
    };

    const { container } = renderWithTier("comfy", <Home copy={homeCopy} preview={livePreview} />);
    expect(container).toBeTruthy();
    expect(screen.getByRole("heading", { name: homeCopy.headline })).toBeInTheDocument();
  });

  it("apply page does not crash in submitted (confirmation) state", () => {
    // Submitted state renders BrandMark in the confirmation — verify no crash.
    const { container } = renderWithTier(
      "comfy",
      <Apply copy={applyCopy} submitted turnstile={{ enabled: false, site_key: null }} />,
    );
    expect(container).toBeTruthy();
    expect(screen.getByText(applyCopy.confirmation_headline)).toBeInTheDocument();
  });

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
    };

    const { container } = renderStoreShowAtTier("wide", propsWithCrates);
    expect(container).toBeTruthy();
    // Browse shell renders Wall panel when crates exist
    expect(screen.getByRole("region", { name: "The Wall" })).toBeInTheDocument();
  });

  it("store sync failure exposes semantic danger feedback without hiding fallback content", () => {
    const failedStoreProps: StoreShowProps = {
      ...storeShowProps,
      store: {
        ...storeShowProps.store,
        sync_status: "failed",
        last_sync_error_at: "2026-05-25T12:00:00Z",
      },
    };

    renderStoreShowAtTier("wide", failedStoreProps);

    expect(screen.getByText(/Sync failed/).closest("[role='alert']")).toHaveClass(
      "text-mc-feedback-danger",
    );
    expect(screen.getByText(/No vinyl found yet/)).toBeInTheDocument();
  });

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
    };

    // all tiers render the same browse shell with Wall region
    for (const tier of tiers) {
      cleanup();
      renderStoreShowAtTier(tier, propsWithSections);
      expect(screen.getByRole("region", { name: "The Wall" })).toBeInTheDocument();
      expect(screen.getByText(/Today's picks, the store's taste at a glance/i)).toBeInTheDocument();
    }
  });

  it("compact tier renders the browse shell with bottom-anchored navigation", () => {
    renderStoreShowAtTier("compact", compactStoreProps);

    expect(screen.getByRole("navigation", { name: "Browse modes" })).toHaveClass("fixed");
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "The Wall" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Featured" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Genres" })).toBeInTheDocument();
    expect(screen.getByText(/Today's picks, the store's taste at a glance/i)).toBeInTheDocument();
  });

  it("switching browse modes clears active crate and shows the panel prompt", async () => {
    const user = userEvent.setup();
    renderStoreShowAtTier("compact", compactStoreProps);

    await user.click(screen.getByRole("button", { name: "Featured" }));

    expect(screen.getByRole("button", { name: "Featured" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/Pick a Featured crate/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Genres" }));

    expect(screen.getByRole("button", { name: "Genres" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Pick a genre crate/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("deep-linked crates render through the browse shell at all tiers", () => {
    history.replaceState({ crateSlug: "jazz", startIndex: 1 }, "", "/stores/test?crate=jazz");

    for (const tier of tiers) {
      cleanup();
      renderStoreShowAtTier(tier, compactStoreProps);

      // Browse shell is present with its navigation at all tiers
      expect(screen.getByRole("button", { name: "The Wall" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Featured" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Genres" })).toBeInTheDocument();

      // Featured mode is active because jazz is in the featured section
      expect(screen.getByRole("button", { name: "Featured" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Crate chip bar with tabs is rendered
      expect(screen.getByRole("tablist", { name: "Crates" })).toBeInTheDocument();

      // Inline crate stage shows the deep-linked crate's records at the specified start index
      expect(
        screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" }),
      ).toBeInTheDocument();
    }
  });
});

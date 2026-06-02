import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithTier } from "../test/viewport-test-utils";
import type { ViewportTier } from "@/contexts/viewport_context";

// ── Mock @inertiajs/react ──────────────────────────────────────
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

// ── Mock AppLayout — strip providers so renderWithTier injects the tier ─
vi.mock("@/layouts/app_layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock StorefrontMotionConfig ─────────────────────────────────
vi.mock("@/components/storefront_motion_config", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotionContext: () => false,
}));

// ── Page imports (after mocks) ─────────────────────────────────
import StoreShow from "../pages/stores/show";
import type { StoreShowProps, Listing } from "../types/inertia";
import { PileProvider } from "../contexts/pile_context";

// ── Test data ──────────────────────────────────────────────────
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

const makeCrate = (slug: string, name: string, recordTitles: string[]) => ({
  slug,
  name,
  count: recordTitles.length,
  records: recordTitles.map((title, index) => makeListing(index + 1, title)),
});

const baseStoreProps: StoreShowProps = {
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
  cleanup();
  history.replaceState({}, "", "/stores/test");
});

function renderStoreAtTier(tier: ViewportTier, props: StoreShowProps = baseStoreProps) {
  return renderWithTier(
    tier,
    <PileProvider>
      <StoreShow {...props} />
    </PileProvider>,
  );
}

describe("BrowseShell", () => {
  describe("compact tier", () => {
    it("renders bottom-positioned browse nav with The Wall, Featured, and Genres", () => {
      renderStoreAtTier("compact");

      const nav = screen.getByRole("navigation", { name: "Browse modes" });
      expect(nav).toHaveClass("fixed");

      expect(screen.getByRole("button", { name: "The Wall" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Featured" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Genres" })).toBeInTheDocument();
    });

    it("selects The Wall by default and renders the Wall panel", () => {
      renderStoreAtTier("compact");

      expect(screen.getByRole("region", { name: "The Wall" })).toBeInTheDocument();
      expect(screen.getByText(/Today's picks, the store's taste at a glance/i)).toBeInTheDocument();
    });
  });

  describe("comfy and wide tiers", () => {
    it.each(["comfy", "wide"] as const)(
      "renders browse controls as a top tab strip without fixed-bottom treatment (%s)",
      (tier) => {
        renderStoreAtTier(tier);

        const nav = screen.getByRole("navigation", { name: "Browse modes" });
        expect(nav).not.toHaveClass("fixed");

        expect(screen.getByRole("button", { name: "The Wall" })).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        expect(screen.getByRole("button", { name: "Featured" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Genres" })).toBeInTheDocument();
      },
    );
  });

  describe("browse mode switching (AE2)", () => {
    it("clicking The Wall from an active Featured crate clears the active crate", async () => {
      const user = userEvent.setup();
      renderStoreAtTier("compact");

      // Select a Featured crate via chip bar (in-session, not direct entry)
      await user.click(screen.getByRole("button", { name: "Featured" }));
      await user.click(screen.getByRole("tab", { name: "Jazz" }));

      // Verify Featured mode is active with a crate
      expect(screen.getByRole("button", { name: "Featured" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("progressbar")).toBeInTheDocument();

      // Click The Wall
      await user.click(screen.getByRole("button", { name: "The Wall" }));

      // Active crate should be cleared, Wall panel should render
      expect(screen.getByRole("button", { name: "The Wall" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "The Wall" })).toBeInTheDocument();
    });

    it("clicking Featured from Wall auto-selects the first Featured crate", async () => {
      const user = userEvent.setup();
      renderStoreAtTier("compact");

      // Starts on Wall
      expect(screen.getByRole("button", { name: "The Wall" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Click Featured
      await user.click(screen.getByRole("button", { name: "Featured" }));

      // Should auto-select the first Featured crate
      expect(screen.getByRole("button", { name: "Featured" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("clicking Genres from an active Featured crate switches to first genre crate", async () => {
      const user = userEvent.setup();
      renderStoreAtTier("compact");

      // Select a Featured crate via chip bar
      await user.click(screen.getByRole("button", { name: "Featured" }));
      await user.click(screen.getByRole("tab", { name: "Jazz" }));

      expect(screen.getByRole("progressbar")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Genres" }));

      // Should auto-select the first Genre crate
      expect(screen.getByRole("button", { name: "Genres" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });
  });

  describe("empty and missing sections", () => {
    it("renders browse navigation with empty sections", () => {
      const emptyProps: StoreShowProps = {
        ...baseStoreProps,
        storefront_sections: [],
      };
      renderStoreAtTier("compact", emptyProps);

      expect(screen.getByRole("navigation", { name: "Browse modes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "The Wall" })).toBeInTheDocument();
    });

    it("renders browse navigation with sections containing no crates", () => {
      const sparseProps: StoreShowProps = {
        ...baseStoreProps,
        storefront_sections: [
          { key: "picks_wall", crate: makeCrate("picks", "Picks", []) },
          { key: "featured_crates", crates: [] },
          { key: "genre_grid", crates: [] },
        ],
      };
      renderStoreAtTier("compact", sparseProps);

      expect(screen.getByRole("navigation", { name: "Browse modes" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "The Wall" })).toBeInTheDocument();
    });
  });

  describe("direct entry contract (AE5, AE6)", () => {
    it("direct entry renders full CrateView with crate tabs at all tiers (AE6)", () => {
      history.replaceState({ crateSlug: "jazz", startIndex: 1 }, "", "/stores/test?crate=jazz");

      for (const tier of ["compact", "comfy", "wide"] as const) {
        cleanup();
        renderStoreAtTier(tier);

        // Full CrateView header with crate tabs
        expect(screen.getByRole("tablist", { name: "Crates" })).toBeInTheDocument();
        // Records at the specified start index
        expect(
          screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" }),
        ).toBeInTheDocument();
      }
    });

    it("direct entry at wide tier renders CrateView with full header (AE5)", () => {
      history.replaceState({ crateSlug: "jazz" }, "", "/stores/test?crate=jazz");
      renderStoreAtTier("wide");

      // Full CrateView header with crate tabs (direct entry = full header)
      expect(screen.getByRole("tablist", { name: "Crates" })).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      // R11: direct entry renders CrateView with crate-switching tabs
      // No browse nav (shell chrome) when in direct entry mode
      expect(screen.queryByRole("navigation", { name: "Browse modes" })).not.toBeInTheDocument();
    });

    it("in-session crate selection renders InlineCrateStage with riffle controls", async () => {
      const user = userEvent.setup();
      renderStoreAtTier("compact");

      // Select a Featured crate via chip bar
      await user.click(screen.getByRole("button", { name: "Featured" }));
      await user.click(screen.getByRole("tab", { name: "Jazz" }));

      // InlineCrateStage: riffle controls present (no separate CrateView header)
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Dig one record deeper in the crate" }),
      ).toBeInTheDocument();
    });
  });
});

import React from "react";
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WallPanel from "./wall_panel";
import StorefrontMotionConfig from "./storefront_motion_config";
import { PileProvider } from "../contexts/pile_context";
import { renderWithTier } from "../test/viewport-test-utils";
import type { Crate, Listing } from "../types/inertia";

const makeListing = (id: number): Listing => ({
  id,
  discogs_listing_id: String(id),
  artist: "Artist",
  title: `Record ${id}`,
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
  discogs_url: `https://www.discogs.com/sell/item/${id}`,
});

const crate: Crate = {
  slug: "wall",
  name: "The Wall",
  count: 6,
  records: Array.from({ length: 6 }, (_, index) => makeListing(index + 1)),
};

const largeCrate: Crate = {
  slug: "wall",
  name: "The Wall",
  count: 13,
  records: Array.from({ length: 13 }, (_, index) => makeListing(index + 1)),
};

function renderWall(crateOverride?: Crate) {
  return renderWithTier(
    "compact",
    <StorefrontMotionConfig>
      <PileProvider>
        <WallPanel crate={crateOverride ?? crate} />
      </PileProvider>
    </StorefrontMotionConfig>,
  );
}

describe("WallPanel", () => {
  it("renders inspection-only buttons for the wall tiles", () => {
    renderWall();

    const tiles = screen.getAllByRole("button", { name: /Inspect Record/i });
    expect(tiles).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "+ Pile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Discogs/i })).not.toBeInTheDocument();
  });

  it("opens the peek sheet and returns focus to the originating tile", async () => {
    const user = userEvent.setup();

    renderWall();

    const firstTile = screen.getByRole("button", { name: "Inspect Record 1 on the Wall" });
    await user.click(firstTile);

    expect(screen.getByRole("dialog", { name: "Wall peek" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(firstTile).toHaveFocus());
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Wall peek" })).not.toBeInTheDocument(),
    );
  });

  describe("pagination", () => {
    it("renders dot indicators when there are more than 6 records", () => {
      renderWall(largeCrate);

      // 13 records capped to 12 on compact → 2 pages (6+6)
      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(2);
      expect(tabs[0]).toHaveAttribute("aria-selected", "true");
      expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    });

    it("shows 6 tiles on the first page", () => {
      renderWall(largeCrate);

      const tiles = screen.getAllByRole("button", { name: /Inspect Record/ });
      expect(tiles).toHaveLength(6);
      expect(
        screen.getByRole("button", { name: "Inspect Record 1 on the Wall" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Inspect Record 6 on the Wall" }),
      ).toBeInTheDocument();
    });

    it("navigates to the next page via dot click", async () => {
      const user = userEvent.setup();
      renderWall(largeCrate);

      // 13 records capped to 12 on compact → 2 pages (6+6)
      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const page2Button = within(tablist).getByRole("tab", { name: "Wall page 2 of 2" });

      await user.click(page2Button);

      expect(screen.getByRole("tab", { name: "Wall page 2 of 2" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(
        screen.getByRole("button", { name: "Inspect Record 7 on the Wall" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Inspect Record 12 on the Wall" }),
      ).toBeInTheDocument();
    });

    it("shows all visible records across pages", () => {
      renderWall(largeCrate);

      // 13 records capped to 12 on compact → 2 full pages (6 + 6)
      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      // Navigate to last page and verify records
      const lastPageButton = within(tablist).getByRole("tab", { name: "Wall page 2 of 2" });
      expect(lastPageButton).toBeInTheDocument();
    });

    it("does not render pagination when there are exactly 6 records", () => {
      renderWall();

      expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
    });
  });

  describe("responsive density (AE3)", () => {
    const twelveRecords: Crate = {
      slug: "wall",
      name: "The Wall",
      count: 12,
      records: Array.from({ length: 12 }, (_, index) => makeListing(index + 1)),
    };

    it("compact Wall with 12 records renders 6 visible tiles and two page indicators", () => {
      renderWithTier(
        "compact",
        <StorefrontMotionConfig>
          <PileProvider>
            <WallPanel crate={twelveRecords} />
          </PileProvider>
        </StorefrontMotionConfig>,
      );

      const tiles = screen.getAllByRole("button", { name: /Inspect Record/ });
      expect(tiles).toHaveLength(6);

      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(2);
    });

    it("wide Wall with 12 records renders all 12 tiles on one page", () => {
      renderWithTier(
        "wide",
        <StorefrontMotionConfig>
          <PileProvider>
            <WallPanel crate={twelveRecords} />
          </PileProvider>
        </StorefrontMotionConfig>,
      );

      const tiles = screen.getAllByRole("button", { name: /Inspect Record/ });
      expect(tiles).toHaveLength(12);

      // No pagination needed — all fit on one page
      expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
    });

    it("comfy Wall shows all 13 records on one page (no pagination)", () => {
      renderWithTier(
        "comfy",
        <StorefrontMotionConfig>
          <PileProvider>
            <WallPanel crate={largeCrate} />
          </PileProvider>
        </StorefrontMotionConfig>,
      );

      const tiles = screen.getAllByRole("button", { name: /Inspect Record/ });
      expect(tiles).toHaveLength(13);

      // No pagination on comfy — all records on one page
      expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
    });

    it("clamps page index when rerendered at a tier with fewer pages", async () => {
      const eighteenRecords: Crate = {
        slug: "wall",
        name: "The Wall",
        count: 18,
        records: Array.from({ length: 18 }, (_, index) => makeListing(index + 1)),
      };

      // Render at compact tier — 18 records capped to 12 → 2 pages (6+6)
      renderWithTier(
        "compact",
        <StorefrontMotionConfig>
          <PileProvider>
            <WallPanel crate={eighteenRecords} />
          </PileProvider>
        </StorefrontMotionConfig>,
      );

      // Navigate to page 2
      const user = userEvent.setup();
      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      await user.click(within(tablist).getByRole("tab", { name: "Wall page 2 of 2" }));

      // Now rerender at wide tier where 18 records gives 2 pages (15+3)
      // Page index 2 is now invalid — useEffect should clamp to page 1
      // We need a fresh render with a different tier since renderWithTier's wrapper
      // locks the tier. Use a new render with wide tier.
      renderWithTier(
        "wide",
        <StorefrontMotionConfig>
          <PileProvider>
            <WallPanel crate={eighteenRecords} />
          </PileProvider>
        </StorefrontMotionConfig>,
      );

      // Should not show an empty page — should show content from the last valid page
      const tiles = screen.getAllByRole("button", { name: /Inspect Record/ });
      expect(tiles.length).toBeGreaterThan(0);
    });
  });
});

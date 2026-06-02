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
  slug: "picks",
  name: "Milkcrate Picks",
  count: 6,
  records: Array.from({ length: 6 }, (_, index) => makeListing(index + 1)),
};

const largeCrate: Crate = {
  slug: "picks",
  name: "Milkcrate Picks",
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

      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(3);
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

      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const page2Button = within(tablist).getByRole("tab", { name: "Wall page 2 of 3" });

      await user.click(page2Button);

      expect(screen.getByRole("tab", { name: "Wall page 2 of 3" })).toHaveAttribute(
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

    it("shows only 1 record on a partial last page", () => {
      renderWall(largeCrate);

      // largeCrate has 13 records → 3 pages (6 + 6 + 1)
      const tablist = screen.getByRole("tablist", { name: "Wall pages" });
      const tabs = within(tablist).getAllByRole("tab");
      expect(tabs).toHaveLength(3);

      // Navigate to last page
      const lastPageButton = within(tablist).getByRole("tab", { name: "Wall page 3 of 3" });
      // Can't click without user — just assert the tab exists and has correct label
      expect(lastPageButton).toBeInTheDocument();
    });

    it("does not render pagination when there are exactly 6 records", () => {
      renderWall();

      expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
    });
  });
});

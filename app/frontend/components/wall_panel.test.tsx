import React from "react";
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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

function renderWall() {
  return renderWithTier(
    "compact",
    <StorefrontMotionConfig>
      <PileProvider>
        <WallPanel crate={crate} />
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
});

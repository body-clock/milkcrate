import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it } from "vitest";

import { PileProvider } from "../contexts/pile_context";
import { renderWithTier } from "../test/viewport-test-utils";
import type { Crate, Listing } from "../types/inertia";
import StorefrontMotionConfig from "./storefront_motion_config";
import WallPanel from "./wall_panel";

const TILES_PER_PAGE = 6;
const WIDE_TILES = 12;
const COMFY_TILES = 13;
const TOTAL_PAGES_SMALL = 2;

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
  count: TILES_PER_PAGE,
  records: Array.from({ length: TILES_PER_PAGE }, (_, i) => makeListing(i + 1)),
};

const largeCrate: Crate = {
  slug: "wall",
  name: "The Wall",
  count: COMFY_TILES,
  records: Array.from({ length: COMFY_TILES }, (_, i) => makeListing(i + 1)),
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
    expect(tiles).toHaveLength(TILES_PER_PAGE);
    expect(screen.queryByRole("button", { name: "+ Pile" })).not.toBeInTheDocument();
  });

  it("opens the peek sheet and returns focus to the originating tile", async () => {
    const user = userEvent.setup();
    renderWall();
    const firstTile = screen.getByRole("button", { name: "Inspect Record 1 on the Wall" });
    await user.click(firstTile);
    expect(screen.getByRole("dialog", { name: "Record peek" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(firstTile).toHaveFocus());
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Record peek" })).not.toBeInTheDocument(),
    );
  });
});

describe("WallPanel pagination dots", () => {
  it("renders dot indicators when there are more than 6 records", () => {
    renderWall(largeCrate);
    const tabs = within(screen.getByRole("tablist", { name: "Wall pages" })).getAllByRole("tab");
    expect(tabs).toHaveLength(TOTAL_PAGES_SMALL);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });
  it("navigates to the next page via dot click", async () => {
    const user = userEvent.setup();
    renderWall(largeCrate);
    const page2 = within(screen.getByRole("tablist", { name: "Wall pages" })).getByRole("tab", {
      name: "Wall page 2 of 2",
    });
    await user.click(page2);
    expect(screen.getByRole("tab", { name: "Wall page 2 of 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("WallPanel tile display", () => {
  it("shows 6 tiles on the first page", () => {
    renderWall(largeCrate);
    expect(screen.getAllByRole("button", { name: /Inspect Record/ })).toHaveLength(TILES_PER_PAGE);
  });
  it("does not render pagination for exactly 6 records", () => {
    renderWall();
    expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
  });
});

describe("WallPanel responsive wide", () => {
  const twelveCrate: Crate = {
    slug: "wall",
    name: "The Wall",
    count: WIDE_TILES,
    records: Array.from({ length: WIDE_TILES }, (_, i) => makeListing(i + 1)),
  };
  it("wide renders all 12 tiles on one page", () => {
    renderWithTier(
      "wide",
      <StorefrontMotionConfig>
        <PileProvider>
          <WallPanel crate={twelveCrate} />
        </PileProvider>
      </StorefrontMotionConfig>,
    );
    expect(screen.getAllByRole("button", { name: /Inspect Record/ })).toHaveLength(WIDE_TILES);
    expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
  });
  it("comfy shows all 13 records on one page", () => {
    renderWithTier(
      "comfy",
      <StorefrontMotionConfig>
        <PileProvider>
          <WallPanel crate={largeCrate} />
        </PileProvider>
      </StorefrontMotionConfig>,
    );
    expect(screen.getAllByRole("button", { name: /Inspect Record/ })).toHaveLength(COMFY_TILES);
    expect(screen.queryByRole("tablist", { name: "Wall pages" })).not.toBeInTheDocument();
  });
});

describe("WallPanel compact 12 records", () => {
  it("renders 6 tiles and 2 pages", () => {
    renderWithTier(
      "compact",
      <StorefrontMotionConfig>
        <PileProvider>
          <WallPanel
            crate={{
              slug: "wall",
              name: "The Wall",
              count: WIDE_TILES,
              records: Array.from({ length: WIDE_TILES }, (_, i) => makeListing(i + 1)),
            }}
          />
        </PileProvider>
      </StorefrontMotionConfig>,
    );
    expect(screen.getAllByRole("button", { name: /Inspect Record/ })).toHaveLength(TILES_PER_PAGE);
    expect(
      within(screen.getByRole("tablist", { name: "Wall pages" })).getAllByRole("tab"),
    ).toHaveLength(TOTAL_PAGES_SMALL);
  });
});

describe("WallPanel tier page clamp", () => {
  it("clamps page index when tier has fewer pages", async () => {
    const user = userEvent.setup();
    const eCrate: Crate = {
      slug: "wall",
      name: "The Wall",
      count: 18,
      records: Array.from({ length: 18 }, (_, i) => makeListing(i + 1)),
    };
    const renderCompact = () =>
      renderWithTier(
        "compact",
        <StorefrontMotionConfig>
          <PileProvider>
            <WallPanel crate={eCrate} />
          </PileProvider>
        </StorefrontMotionConfig>,
      );
    renderCompact();
    await user.click(
      within(screen.getByRole("tablist", { name: "Wall pages" })).getByRole("tab", {
        name: "Wall page 2 of 2",
      }),
    );
    renderWithTier(
      "wide",
      <StorefrontMotionConfig>
        <PileProvider>
          <WallPanel crate={eCrate} />
        </PileProvider>
      </StorefrontMotionConfig>,
    );
    expect(screen.getAllByRole("button", { name: /Inspect Record/ }).length).toBeGreaterThan(0);
  });
});

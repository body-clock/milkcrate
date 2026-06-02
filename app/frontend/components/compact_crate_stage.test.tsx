import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import CompactCrateStage from "./compact_crate_stage";
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

const makeCrate = (recordCount = 3): Crate => ({
  slug: "jazz",
  name: "Jazz",
  count: recordCount,
  records: Array.from({ length: recordCount }, (_, index) => makeListing(index + 1)),
});

function renderStage(crate: Crate, activeSlug = crate.slug, startIndex = 0) {
  return renderWithTier(
    "compact",
    <StorefrontMotionConfig>
      <PileProvider>
        <CompactCrateStage
          crates={[crate]}
          activeSlug={activeSlug}
          startIndex={startIndex}
          onSelectCrate={vi.fn()}
        />
      </PileProvider>
    </StorefrontMotionConfig>,
  );
}

describe("CompactCrateStage", () => {
  it("renders the compact card stack and progress controls at the requested index", () => {
    renderStage(makeCrate(), "jazz", 1);

    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move toward the front of the crate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dig one record deeper in the crate" })).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" }),
    ).toBeInTheDocument();
  });

  it("renders the empty crate state instead of crashing", () => {
    renderStage(makeCrate(0), "jazz");

    expect(screen.getByText("No records in this crate yet.")).toBeInTheDocument();
  });
});

import { cleanup, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PileProvider } from "../contexts/pile_context";
import { renderWithTier } from "../test/viewport-test-utils";
import type { Crate, Listing } from "../types/inertia";
import InlineCrateStage from "./inline_crate_stage";
import StorefrontMotionConfig from "./storefront_motion_config";

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

const DEFAULT_CRATE_SIZE = 3;

const makeCrate = (recordCount = DEFAULT_CRATE_SIZE): Crate => ({
  slug: "jazz",
  name: "Jazz",
  count: recordCount,
  records: Array.from({ length: recordCount }, (_, index) => makeListing(index + 1)),
});

function renderStage(crate: Crate, activeSlug: string | null = crate.slug, startIndex = 0) {
  return renderWithTier(
    "compact",
    <StorefrontMotionConfig>
      <PileProvider>
        <InlineCrateStage
          crates={[crate]}
          activeSlug={activeSlug}
          startIndex={startIndex}
          onSelectCrate={vi.fn()}
        />
      </PileProvider>
    </StorefrontMotionConfig>,
  );
}

describe("InlineCrateStage", () => {
  it("renders the card stack and progress controls at the requested index", () => {
    renderStage(makeCrate(), "jazz", 1);

    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Move toward the front of the crate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dig one record deeper in the crate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Record 2 of 3, front to deeper" }),
    ).toBeInTheDocument();
  });

  it("renders the empty crate state instead of crashing", () => {
    renderStage(makeCrate(0), "jazz");

    expect(screen.getByText("No records in this crate yet.")).toBeInTheDocument();
  });

  it("renders nothing when activeSlug is null", () => {
    const { container } = renderStage(makeCrate(), null);

    expect(container.innerHTML).toBe("");
  });

  it("renders at compact, comfy, and wide tiers without nested crate tabs", () => {
    for (const tier of ["compact", "comfy", "wide"] as const) {
      cleanup();
      renderWithTier(
        tier,
        <StorefrontMotionConfig>
          <PileProvider>
            <InlineCrateStage
              crates={[makeCrate()]}
              activeSlug="jazz"
              startIndex={0}
              onSelectCrate={vi.fn()}
            />
          </PileProvider>
        </StorefrontMotionConfig>,
      );

      expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    }
  });
});

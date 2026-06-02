import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StoreFloor from "@/components/store_floor";
import StorefrontMotionConfig from "@/components/storefront_motion_config";
import { ViewportProvider } from "@/contexts/viewport_context";
import { renderWithTier } from "../test/viewport-test-utils";
import type { StorefrontSection, Crate, Listing } from "../types/inertia";

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

const makeCrate = (slug: string, recordCount = 4): Crate => ({
  slug,
  name: slug,
  count: recordCount,
  records: Array.from({ length: recordCount }, (_, i) => makeListing(i + 1)),
});

const picksSectionWith = (records: number): StorefrontSection => ({
  key: "picks_wall",
  crate: makeCrate("picks", records),
});

const featuredSection = (count = 2): StorefrontSection => ({
  key: "featured_crates",
  crates: Array.from({ length: count }, (_, i) => makeCrate(`featured-${i}`)),
});

const genreSection = (count = 3): StorefrontSection => ({
  key: "genre_grid",
  crates: Array.from({ length: count }, (_, i) => makeCrate(`genre-${i}`)),
});

const renderFloor = (sections: StorefrontSection[]) =>
  render(
    <StorefrontMotionConfig>
      <ViewportProvider>
        <StoreFloor sections={sections} onSelectCrate={vi.fn()} />
      </ViewportProvider>
    </StorefrontMotionConfig>,
  );

const renderFloorAtTier = (sections: StorefrontSection[], tier: "compact" | "comfy" | "wide") =>
  renderWithTier(
    tier,
    <StorefrontMotionConfig>
      <StoreFloor sections={sections} onSelectCrate={vi.fn()} />
    </StorefrontMotionConfig>,
  );

describe("StoreFloor section labels", () => {
  describe("Wall section", () => {
    it("renders picks description text when wall has records", () => {
      renderFloor([picksSectionWith(4)]);

      expect(screen.getByText(/Today's picks/)).toBeInTheDocument();
      expect(screen.getByText(/the store's taste at a glance/)).toBeInTheDocument();
    });

    it("has role=region with accessible label for the wall section", () => {
      renderFloor([picksSectionWith(4)]);

      const region = screen.getByRole("region", { name: /Wall/i });
      expect(region).toBeInTheDocument();
    });

    it("does not render wall section when there are 0 records", () => {
      renderFloor([picksSectionWith(0)]);

      expect(screen.queryByText(/Today's picks/)).not.toBeInTheDocument();
    });
  });

  describe("Featured section", () => {
    it("renders 'Curated crates' description text", () => {
      renderFloor([featuredSection()]);

      expect(screen.getByText(/Curated crates hand-picked by the store/)).toBeInTheDocument();
    });

    it("has role=region with accessible label for the featured section", () => {
      renderFloor([featuredSection()]);

      const region = screen.getByRole("region", { name: /Featured/i });
      expect(region).toBeInTheDocument();
    });

    it("does not render description when there are 0 crates", () => {
      renderFloor([{ key: "featured_crates", crates: [] }]);

      expect(screen.queryByText(/Curated crates/)).not.toBeInTheDocument();
    });
  });

  describe("Genre section", () => {
    it("renders 'Browse the full collection' description text", () => {
      renderFloor([genreSection()]);

      expect(screen.getByText(/Browse the full collection by genre/)).toBeInTheDocument();
    });

    it("has role=region with accessible label for the genre section", () => {
      renderFloor([genreSection()]);

      const region = screen.getByRole("region", { name: /Browse by genre/i });
      expect(region).toBeInTheDocument();
    });

    it("does not render description when there are 0 crates", () => {
      renderFloor([{ key: "genre_grid", crates: [] }]);

      expect(screen.queryByText(/Browse the full collection/)).not.toBeInTheDocument();
    });
  });

  describe("integration: all three sections have region landmarks", () => {
    it("renders three distinct region landmarks", () => {
      renderFloor([picksSectionWith(2), featuredSection(2), genreSection(2)]);

      const regions = screen.getAllByRole("region");
      expect(regions.length).toBeGreaterThanOrEqual(3);
    });

    it("compact tier renders all section descriptions", () => {
      renderFloorAtTier([picksSectionWith(2), featuredSection(2), genreSection(2)], "compact");

      expect(screen.getByText(/Today's picks/)).toBeInTheDocument();
      expect(screen.getByText(/Curated crates hand-picked by the store/)).toBeInTheDocument();
      expect(screen.getByText(/Browse the full collection by genre/)).toBeInTheDocument();
    });
  });
});

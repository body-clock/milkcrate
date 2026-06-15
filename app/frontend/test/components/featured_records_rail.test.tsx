import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import FeaturedRecordsRail from "../../components/explore_directory/featured_records_rail";
import type { FeaturedRecord } from "../../components/explore_directory/featured_records_rail";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../components/record_tile", () => ({
  default: ({ listing, ...props }: any) => (
    <div data-testid="record-tile" data-listing-id={listing.id}>
      {listing.cover_image_url ? (
        <img src={listing.cover_image_url} alt={listing.title || ""} />
      ) : (
        <span>♪</span>
      )}
    </div>
  ),
}));

function makeRecord(overrides: Partial<FeaturedRecord> = {}): FeaturedRecord {
  return {
    id: 1,
    title: "Test Album",
    artist: "Test Artist",
    cover_image_url: "https://example.com/cover.jpg",
    store_slug: "teststore",
    store_name: "Test Store",
    ...overrides,
  };
}

describe("FeaturedRecordsRail", () => {
  it("renders nothing when records array is empty", () => {
    const { container } = render(<FeaturedRecordsRail records={[]} label="Featured Records" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders section header with label and count", () => {
    const records = [makeRecord(), makeRecord({ id: 2 })];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    expect(screen.getByRole("heading", { name: /featured records/i })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders record tiles for each record", () => {
    const records = [makeRecord({ id: 1 }), makeRecord({ id: 2 }), makeRecord({ id: 3 })];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    const tiles = screen.getAllByTestId("record-tile");
    // Duplicated for infinite loop, so 6 tiles total
    expect(tiles).toHaveLength(6);
  });

  it("renders links to store pages for each record", () => {
    const records = [
      makeRecord({ id: 1, store_slug: "store1" }),
      makeRecord({ id: 2, store_slug: "store2" }),
    ];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    const links = screen.getAllByRole("link");
    // Duplicated for infinite loop, so 4 links total
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute("href", "/store1");
    expect(links[1]).toHaveAttribute("href", "/store2");
    expect(links[2]).toHaveAttribute("href", "/store1");
    expect(links[3]).toHaveAttribute("href", "/store2");
  });

  it("displays store name below each record", () => {
    const records = [
      makeRecord({ id: 1, store_name: "Alpha Records" }),
      makeRecord({ id: 2, store_name: "Beta Music" }),
    ];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    // Duplicated for infinite loop, so each name appears twice
    const alphaElements = screen.getAllByText("Alpha Records");
    const betaElements = screen.getAllByText("Beta Music");
    expect(alphaElements.length).toBe(2);
    expect(betaElements.length).toBe(2);
  });

  it("renders scrollable container", () => {
    const records = [makeRecord()];
    const { container } = render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    const scrollContainer = container.querySelector(".overflow-hidden");
    expect(scrollContainer).toBeTruthy();
  });

  it("duplicates records for infinite loop", () => {
    const records = [makeRecord({ id: 1 }), makeRecord({ id: 2 })];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    const tiles = screen.getAllByTestId("record-tile");
    // Should have 4 tiles (2 original + 2 duplicates)
    expect(tiles).toHaveLength(4);
  });
});

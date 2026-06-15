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
    expect(tiles).toHaveLength(3);
  });

  it("renders links to store pages for each record", () => {
    const records = [
      makeRecord({ id: 1, store_slug: "store1" }),
      makeRecord({ id: 2, store_slug: "store2" }),
    ];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/store1");
    expect(links[1]).toHaveAttribute("href", "/store2");
  });

  it("displays store name below each record", () => {
    const records = [
      makeRecord({ id: 1, store_name: "Alpha Records" }),
      makeRecord({ id: 2, store_name: "Beta Music" }),
    ];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    expect(screen.getByText("Alpha Records")).toBeInTheDocument();
    expect(screen.getByText("Beta Music")).toBeInTheDocument();
  });

  it("renders horizontal scrollable container", () => {
    const records = [makeRecord()];
    render(<FeaturedRecordsRail records={records} label="Featured Records" />);
    const container = document.querySelector(".flex.overflow-x-auto");
    expect(container).toBeTruthy();
    expect(container).toHaveClass("snap-x");
    expect(container).toHaveClass("snap-mandatory");
  });
});

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import type { Listing } from "../types/inertia";
import RecordTile from "./record_tile";
import StorefrontMotionConfig from "./storefront_motion_config";

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Test Record",
  label: "Label",
  year: 2024,
  format: null,
  genres: ["Rock"],
  styles: [],
  condition: "VG+",
  price: "12.00",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: null,
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
});

function renderTile(props: Partial<React.ComponentProps<typeof RecordTile>> = {}) {
  return render(
    <StorefrontMotionConfig>
      <RecordTile listing={makeListing()} {...props} />
    </StorefrontMotionConfig>,
  );
}

describe("RecordTile / cover images", () => {
  it("renders cover image when cover_image_url exists", () => {
    const listing = makeListing({
      cover_image_url: "https://example.com/cover.jpg",
    });
    renderTile({ listing });
    const img = screen.getByRole("img", { name: "Test Record" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("renders fallback placeholder when no cover image exists", () => {
    renderTile({ listing: makeListing({ cover_image_url: null }) });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const tile = document.querySelector(".bg-mc-bg-raised");
    expect(tile).toBeInTheDocument();
    expect(tile?.textContent).toContain("♪");
  });

  it("renders thumbnail_url when cover_image_url is null", () => {
    const listing = makeListing({
      cover_image_url: null,
      thumbnail_url: "https://example.com/thumb.jpg",
    });
    renderTile({ listing });
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");
  });

  it("prefers cover_image_url over thumbnail_url", () => {
    const listing = makeListing({
      cover_image_url: "https://example.com/cover.jpg",
      thumbnail_url: "https://example.com/thumb.jpg",
    });
    renderTile({ listing });
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });
});

describe("RecordTile / edge cases", () => {
  it("handles null title with empty alt text", () => {
    const listing = makeListing({
      title: null,
      cover_image_url: "https://example.com/cover.jpg",
    });
    renderTile({ listing });
    expect(document.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("renders with null artist gracefully", () => {
    renderTile({ listing: makeListing({ artist: null, title: null, cover_image_url: null }) });
    expect(document.querySelector(".bg-mc-bg-raised")).toBeInTheDocument();
  });

  it("handles both cover_image_url and thumbnail_url as null", () => {
    renderTile({ listing: makeListing({ cover_image_url: null, thumbnail_url: null }) });
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(document.querySelector(".bg-mc-bg-raised")).toBeInTheDocument();
  });

  it("renders with responsive aspect-square container", () => {
    renderTile({ listing: makeListing({ cover_image_url: "https://example.com/cover.jpg" }) });
    expect(screen.getByRole("img")).toHaveClass("object-cover");
  });
});

describe("RecordTile / props", () => {
  it("applies className to the wrapper", () => {
    renderTile({ className: "custom-tile" });
    expect(document.querySelector(".custom-tile")).toBeInTheDocument();
  });

  it("sets image loading attribute", () => {
    renderTile({
      listing: makeListing({ cover_image_url: "https://example.com/cover.jpg" }),
      imageLoading: "eager",
    });
    expect(screen.getByRole("img")).toHaveAttribute("loading", "eager");
  });

  it("defaults image loading to lazy", () => {
    renderTile({ listing: makeListing({ cover_image_url: "https://example.com/cover.jpg" }) });
    expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
  });
});

describe("RecordTile / tactileHover", () => {
  it("adds hover scale CSS class when tactileHover is true", () => {
    renderTile({ tactileHover: true });
    expect(document.querySelector(".aspect-square")?.className).toContain("hover:scale-[1.015]");
  });

  it("does not add hover scale class when tactileHover is false", () => {
    renderTile({ tactileHover: false });
    expect(document.querySelector(".aspect-square")?.className).not.toContain("hover:scale");
  });

  it("does not add hover scale class by default", () => {
    renderTile();
    expect(document.querySelector(".aspect-square")?.className).not.toContain("hover:scale");
  });
});

describe("RecordTile / accessibility", () => {
  it("images have alt text from the listing title", () => {
    renderTile({
      listing: makeListing({
        title: "Dark Side of the Moon",
        cover_image_url: "https://example.com/cover.jpg",
      }),
    });
    expect(screen.getByRole("img", { name: "Dark Side of the Moon" })).toBeInTheDocument();
  });

  it("images are not draggable", () => {
    renderTile({ listing: makeListing({ cover_image_url: "https://example.com/cover.jpg" }) });
    expect(screen.getByRole("img")).toHaveAttribute("draggable", "false");
  });
});

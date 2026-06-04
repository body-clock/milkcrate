import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import StorefrontMotionConfig from "@/components/storefront_motion_config";
import { PileProvider, usePileContext } from "@/contexts/pile_context";

import type { Listing } from "../types/inertia";
import PileToast from "./pile_toast";

const TOAST_TIMEOUT_ADVANCE = 2001;

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

function AddButton({ listing }: { listing: Listing }) {
  const { addToPile } = usePileContext();
  return (
    <button type="button" onClick={() => addToPile(listing)}>
      Add to pile
    </button>
  );
}

function renderWithHelper(listing: Listing) {
  return render(
    <StorefrontMotionConfig>
      <PileProvider>
        <PileToast />
        <AddButton listing={listing} />
      </PileProvider>
    </StorefrontMotionConfig>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("PileToast — happy path", () => {
  it("does not render when nothing has been added", () => {
    render(
      <StorefrontMotionConfig>
        <PileProvider>
          <PileToast />
        </PileProvider>
      </StorefrontMotionConfig>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders toast with record title after adding to pile", () => {
    renderWithHelper(makeListing({ title: "Purple Rain" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Added Purple Rain to pile/)).toBeInTheDocument();
  });

  it("renders with aria-live=polite", () => {
    renderWithHelper(makeListing({ title: "Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("auto-dismisses: clearLastAdded called after 2 seconds", () => {
    renderWithHelper(makeListing({ title: "Time Test" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));
    expect(screen.getByText(/Added Time Test to pile/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(TOAST_TIMEOUT_ADVANCE));
    const toastEl = screen.getByText(/Added Time Test to pile/).closest("[role='status']");
    expect(toastEl).toHaveStyle("opacity: 0");
  });
});

describe("PileToast — edge cases", () => {
  it("truncates very long titles with ellipsis", () => {
    const longTitle = "This Is A Very Long Record Title That Exceeds Thirty Characters";
    renderWithHelper(makeListing({ title: longTitle }));
    fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));
    expect(screen.getByRole("status").textContent).toContain("\u2026");
  });

  it("uses 'record' fallback when title is null", () => {
    renderWithHelper(makeListing({ title: null }));
    fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));
    expect(screen.getByText(/Added record to pile/)).toBeInTheDocument();
  });

  it("no toast renders when lastAdded is null", () => {
    render(
      <StorefrontMotionConfig>
        <PileProvider>
          <PileToast />
        </PileProvider>
      </StorefrontMotionConfig>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

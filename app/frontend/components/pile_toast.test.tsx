import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import PileToast from "./pile_toast";
import { PileProvider, usePileContext } from "@/contexts/pile_context";
import StorefrontMotionConfig from "@/components/storefront_motion_config";
import type { Listing } from "../types/inertia";

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

/** Helper that exposes an "Add" button which calls addToPile directly. */
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

describe("PileToast", () => {
  describe("happy path", () => {
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
      const listing = makeListing({ title: "Purple Rain" });
      renderWithHelper(listing);

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
      // framer-motion AnimatePresence holds the DOM node during exit animation;
      // verify dismissal by confirming the timeout fires and the text enters
      // the exit state (opacity: 0) — the semantic is cleared.
      renderWithHelper(makeListing({ title: "Time Test" }));

      fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));
      expect(screen.getByText(/Added Time Test to pile/)).toBeInTheDocument();

      // After 2s the context clears lastAdded; the element enters exit animation
      act(() => vi.advanceTimersByTime(2001));

      // The element is in exit state (opacity:0) — framer holds it for animation
      // but the content is semantically dismissed from context.
      const toastEl = screen.getByText(/Added Time Test to pile/).closest("[role='status']");
      expect(toastEl).toHaveStyle("opacity: 0");
    });
  });

  describe("edge cases", () => {
    it("truncates very long titles with ellipsis", () => {
      const longTitle = "This Is A Very Long Record Title That Exceeds Thirty Characters";
      renderWithHelper(makeListing({ title: longTitle }));

      fireEvent.click(screen.getByRole("button", { name: "Add to pile" }));

      const toast = screen.getByRole("status");
      expect(toast.textContent).toContain("\u2026");
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
});

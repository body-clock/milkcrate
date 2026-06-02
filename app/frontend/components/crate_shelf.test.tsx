import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrateShelf from "./crate_shelf";
import StorefrontMotionConfig from "./storefront_motion_config";
import type { Crate, Listing } from "../types/inertia";

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

const makeCrate = (overrides: Partial<Crate> = {}): Crate => ({
  slug: "jazz-crate",
  name: "Jazz",
  count: 4,
  records: [
    makeListing({ id: 1, title: "Record 1" }),
    makeListing({ id: 2, title: "Record 2" }),
    makeListing({ id: 3, title: "Record 3" }),
    makeListing({ id: 4, title: "Record 4" }),
  ],
  ...overrides,
});

const renderShelf = (ui: React.ReactElement) =>
  render(<StorefrontMotionConfig>{ui}</StorefrontMotionConfig>);

describe("CrateShelf", () => {
  describe("non-interactive mode (default)", () => {
    it("renders crate name", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} />);

      expect(screen.getByText("Jazz")).toBeInTheDocument();
    });

    it("renders record count", () => {
      const crate = makeCrate({ count: 4 });

      renderShelf(<CrateShelf crate={crate} />);

      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("renders RecordTile components for records", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} />);

      // Record titles from RecordTile fallback — ♪ symbols for no-image tiles
      expect(document.querySelectorAll(".bg-mc-bg-raised").length).toBeGreaterThanOrEqual(1);
    });

    it("renders at most 4 record tiles by default", () => {
      const crate = makeCrate({
        count: 8,
        records: Array.from({ length: 8 }, (_, i) =>
          makeListing({ id: i + 1, title: `Record ${i + 1}` }),
        ),
      });

      renderShelf(<CrateShelf crate={crate} />);

      // Should only render 4 tiles max (default previewCount)
      const notes = screen.getAllByText("♪");
      expect(notes.length).toBeLessThanOrEqual(4);
    });

    it("header is not a button in non-interactive mode", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} />);

      expect(screen.getByText("Jazz")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("does not fire onSelectCrate when header is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCrate = vi.fn();
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} onSelectCrate={onSelectCrate} />);

      await user.click(screen.getByText("Jazz"));

      expect(onSelectCrate).not.toHaveBeenCalled();
    });
  });

  describe("interactive mode", () => {
    it("renders header as a clickable element", () => {
      const crate = makeCrate();
      const onSelectCrate = vi.fn();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const button = screen.getByRole("button", { name: "Open Jazz" });
      expect(button).toBeInTheDocument();
    });

    it("calls onSelectCrate with slug when header is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCrate = vi.fn();
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const button = screen.getByRole("button", { name: "Open Jazz" });
      await user.click(button);

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate");
      expect(onSelectCrate).toHaveBeenCalledTimes(1);
    });

    it("calls onSelectCrate with slug and index when a record thumbnail is clicked", async () => {
      const user = userEvent.setup();
      const onSelectCrate = vi.fn();
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const recordBtn = screen.getByRole("button", { name: "Open Jazz at Record 1" });
      await user.click(recordBtn);

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate", 0);
    });

    it("calls onSelectCrate with correct index for 2nd record", async () => {
      const user = userEvent.setup();
      const onSelectCrate = vi.fn();
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const recordBtn = screen.getByRole("button", { name: "Open Jazz at Record 2" });
      await user.click(recordBtn);

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate", 1);
    });

    it("responds to Enter key on header", async () => {
      const user = userEvent.setup();
      const onSelectCrate = vi.fn();
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const button = screen.getByRole("button", { name: "Open Jazz" });
      button.focus();
      await user.keyboard("{Enter}");

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate");
    });

    it("responds to Space key on header", async () => {
      const user = userEvent.setup();
      const onSelectCrate = vi.fn();
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const button = screen.getByRole("button", { name: "Open Jazz" });
      button.focus();
      await user.keyboard(" ");

      expect(onSelectCrate).toHaveBeenCalledWith("jazz-crate");
    });
  });

  describe("product-browsing variant", () => {
    it("shows more than 4 records when previewCount is increased", () => {
      const crate = makeCrate({
        count: 8,
        records: Array.from({ length: 8 }, (_, i) =>
          makeListing({ id: i + 1, title: `Rec ${i + 1}` }),
        ),
      });

      renderShelf(
        <CrateShelf crate={crate} interactive previewCount={6} onSelectCrate={vi.fn()} />,
      );

      // 6 record buttons + 1 header button = 7 total
      expect(screen.getAllByRole("button").length).toBe(7);
    });

    it("renders 3-column grid when previewCount is 6", () => {
      const crate = makeCrate({
        count: 8,
        records: Array.from({ length: 8 }, (_, i) =>
          makeListing({ id: i + 1, title: `Record ${i + 1}` }),
        ),
      });

      const { container } = renderShelf(
        <CrateShelf crate={crate} interactive previewCount={6} onSelectCrate={vi.fn()} />,
      );

      const grid = container.querySelector("[style*='grid-template-columns']");
      expect(grid).toBeInTheDocument();
      // 3 columns for 6-item preview
      expect(grid?.getAttribute("style")).toContain("repeat(3, 1fr)");
    });

    it("renders 2-column grid by default (4-item preview)", () => {
      const crate = makeCrate();

      const { container } = renderShelf(
        <CrateShelf crate={crate} interactive onSelectCrate={vi.fn()} />,
      );

      const grid = container.querySelector("[style*='grid-template-columns']");
      expect(grid).toBeInTheDocument();
      expect(grid?.getAttribute("style")).toContain("repeat(2, 1fr)");
    });

    it("shows fewer records than previewCount when crate has fewer records", () => {
      const crate = makeCrate({
        count: 2,
        records: [
          makeListing({ id: 1, title: "Only Record" }),
          makeListing({ id: 2, title: "Another" }),
        ],
      });

      renderShelf(
        <CrateShelf crate={crate} interactive previewCount={6} onSelectCrate={vi.fn()} />,
      );

      // Should only render available records, not empty tiles
      // 2 record buttons + 1 header button = 3 total
      expect(screen.getAllByRole("button").length).toBe(3);
    });

    it("shows meta text instead of count when meta is provided", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} meta="May 14" />);

      expect(screen.getByText("May 14")).toBeInTheDocument();
      // Count "4" should NOT be shown — meta replaces it
      expect(screen.queryByText("4")).not.toBeInTheDocument();
    });

    it("shows open label that is visible on hover in interactive mode", () => {
      const crate = makeCrate();
      const onSelectCrate = vi.fn();

      renderShelf(
        <CrateShelf crate={crate} interactive openLabel="DIG →" onSelectCrate={onSelectCrate} />,
      );

      // The open label should be present (even if visually hidden via opacity)
      expect(screen.getByText("DIG →")).toBeInTheDocument();
    });

    it("does not show open label in non-interactive mode", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} openLabel="DIG →" />);

      // Open label is only for interactive mode — should not appear
      expect(screen.queryByText("DIG →")).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles crate with 0 records", () => {
      const crate = makeCrate({ count: 0, records: [] });

      renderShelf(<CrateShelf crate={crate} />);

      expect(screen.getByText("Jazz")).toBeInTheDocument();
      expect(screen.queryAllByText("♪").length).toBe(0);
    });

    it("handles crate with 1 record", () => {
      const crate = makeCrate({
        count: 1,
        records: [makeListing({ id: 1, title: "Solo" })],
      });

      renderShelf(<CrateShelf crate={crate} />);

      expect(screen.getByText("Jazz")).toBeInTheDocument();
    });

    it("applies className prop in static mode", () => {
      const crate = makeCrate();

      const { container } = renderShelf(<CrateShelf crate={crate} className="test-shelf" />);

      expect(container.querySelector(".test-shelf")).toBeInTheDocument();
    });

    it("applies className prop in interactive mode", () => {
      const crate = makeCrate();

      const { container } = renderShelf(
        <CrateShelf crate={crate} interactive className="test-shelf" onSelectCrate={vi.fn()} />,
      );

      expect(container.querySelector(".test-shelf")).toBeInTheDocument();
    });

    it("renders interactive variant with correct role", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Open Jazz" })).toBeInTheDocument();
    });
  });

  describe("type contract", () => {
    it("keeps static and interactive shelf props mutually exclusive", () => {
      const crate = makeCrate();

      // @ts-expect-error interactive shelves require onSelectCrate
      const missingHandler = <CrateShelf crate={crate} interactive />;
      // @ts-expect-error static shelves do not accept onSelectCrate
      const staticWithHandler = <CrateShelf crate={crate} onSelectCrate={vi.fn()} />;

      expect(missingHandler.props.interactive).toBe(true);
      expect(staticWithHandler.props.onSelectCrate).toBeDefined();
    });
  });

  describe("accessibility", () => {
    it("interactive header is a native button and focusable by default", () => {
      const crate = makeCrate();
      const onSelectCrate = vi.fn();

      renderShelf(<CrateShelf crate={crate} interactive onSelectCrate={onSelectCrate} />);

      const button = screen.getByRole("button", { name: "Open Jazz" });
      // Native <button> is focusable by default — no tabIndex attribute needed
      expect(button.tagName).toBe("BUTTON");
      expect(button).not.toHaveAttribute("role", "button");
    });

    it("non-interactive mode has no interactive elements", () => {
      const crate = makeCrate();

      renderShelf(<CrateShelf crate={crate} />);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("interactive mode does not nest button elements inside button elements", () => {
      const crate = makeCrate();
      renderShelf(<CrateShelf crate={crate} interactive={true} onSelectCrate={vi.fn()} />);

      // The header is a div with role="button"; thumbnails are <button>s.
      // No <button> should contain another <button>.
      const buttons = document.querySelectorAll("button");
      buttons.forEach((btn) => {
        const nestedButtons = btn.querySelectorAll("button");
        expect(nestedButtons.length).toBe(0);
      });
    });
  });
});

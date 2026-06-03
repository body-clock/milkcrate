import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { PileProvider } from "../contexts/pile_context";
import { ViewportProvider } from "../contexts/viewport_context";
import type { Listing } from "../types/inertia";
import PileSheet from "./pile_sheet";
import RecordCard from "./record_card";
import StorefrontMotionConfig from "./storefront_motion_config";

vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual("@inertiajs/react");
  return {
    ...actual,
    usePage: () => ({ props: { store: { discogs_username: "test-store" }, shopper: null } }),
  };
});

vi.mock("../contexts/shopper_context", () => ({
  useShopperContext: () => ({
    shopper: null,
    isConnected: false,
    state: "idle",
    addToWantlist: vi.fn(),
    wantlistResult: null,
    errorMessage: null,
    resetResult: vi.fn(),
  }),
  ShopperProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderWithPile = (ui: React.ReactElement) =>
  render(
    <StorefrontMotionConfig>
      <ViewportProvider>
        <PileProvider>{ui}</PileProvider>
      </ViewportProvider>
    </StorefrontMotionConfig>,
  );

const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: 1,
  discogs_listing_id: "abc",
  artist: "Artist",
  title: "Title",
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
  discogs_url: "https://www.discogs.com/sell/item/1",
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe("interactive accessibility", () => {
  it("flips a record card with the keyboard", async () => {
    renderWithPile(<RecordCard listing={makeListing({ title: "Keyboard Record" })} />);
    const card = screen.getByRole("button", { name: "Show details for Keyboard Record" });
    card.focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Show cover for Keyboard Record" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("closes the pile sheet with Escape", async () => {
    const onClose = vi.fn();
    renderWithPile(<PileSheet open onClose={onClose} />);
    expect(screen.getByRole("dialog", { name: "Your pile" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});

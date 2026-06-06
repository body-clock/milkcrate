import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Listing } from "../../types/inertia";
import { makeListing, renderPileSheet } from "../../test/shared/pile_sheet_test_helpers";

const mockedPage = vi.hoisted(() => ({
  shopper: { discogs_username: "shopper1" } as { discogs_username: string } | null,
}));

vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual("@inertiajs/react");
  return {
    ...actual,
    usePage: () => ({
      props: {
        store: { discogs_username: "test-store", name: "Test Store", handoff_available: true },
        shopper: mockedPage.shopper,
      },
    }),
  };
});

beforeEach(() => {
  localStorage.clear();
  mockedPage.shopper = { discogs_username: "shopper1" };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PileSheet empty state", () => {
  it("shows empty message when pile is empty", () => {
    renderPileSheet([]);
    expect(screen.getByText(/no records in your pile yet/i)).toBeInTheDocument();
  });

  it("does not show footer when pile is empty", () => {
    renderPileSheet([]);
    expect(screen.queryByText("Total")).toBeNull();
  });
});

describe("PileSheet record display", () => {
  it("renders records with title and artist", async () => {
    renderPileSheet([
      makeListing({ title: "Abbey Road", artist: "The Beatles" }),
      makeListing({ title: "Dark Side", artist: "Pink Floyd" }),
    ]);

    expect(await screen.findByText("Abbey Road")).toBeInTheDocument();
    expect(await screen.findByText("The Beatles")).toBeInTheDocument();
    expect(await screen.findByText("Dark Side")).toBeInTheDocument();
    expect(await screen.findByText("Pink Floyd")).toBeInTheDocument();
  });

  it("renders record price using formatPriceValue", async () => {
    renderPileSheet([makeListing({ price: "15.99", currency: "USD" })]);
    const prices = await screen.findAllByText("$15.99");
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it("shows — for records with null price", async () => {
    renderPileSheet([makeListing({ price: "" })]);
    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("shows ♪ fallback for records with no cover image", async () => {
    renderPileSheet([makeListing({ cover_image_url: null, thumbnail_url: null })]);
    expect(await screen.findByText("♪")).toBeInTheDocument();
  });
});

describe("PileSheet record removal", () => {
  it("removes a record via the × button", async () => {
    renderPileSheet([makeListing({ title: "Remove Me" })]);
    expect(await screen.findByText("Remove Me")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /remove.*pile/i }));
    await waitFor(() => {
      expect(screen.queryByText("Remove Me")).toBeNull();
      expect(screen.getByText(/no records in your pile yet/i)).toBeInTheDocument();
    });
  });

  it("keeps focus inside the modal after removing the focused final record", async () => {
    renderPileSheet([makeListing({ title: "Last Record" })]);

    await userEvent.click(
      await screen.findByRole("button", { name: "Remove Last Record from pile" }),
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    expect(document.getElementById("pile-sheet-title")).toHaveFocus();
  });
});

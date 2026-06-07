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

describe("PileSheet total calculation", () => {
  it("shows sum of all record prices", async () => {
    renderPileSheet([
      makeListing({ price: "10.00", currency: "USD" }),
      makeListing({ price: "15.50", currency: "USD" }),
    ]);

    await waitFor(() => {
      const footerTotals = screen.getAllByText(/^\$\d+\.\d{2}$/);
      const totalTexts = footerTotals.map((el) => el.textContent);
      expect(totalTexts).toContain("$25.50");
    });
  });

  it("handles records with null prices in total", async () => {
    renderPileSheet([makeListing({ price: "10.00", currency: "USD" }), makeListing({ price: "" })]);

    const priceElements = await screen.findAllByText("$10.00");
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Total label in footer when pile has records", async () => {
    renderPileSheet([makeListing({ price: "5.00", currency: "USD" })]);
    expect(await screen.findByText("Total")).toBeInTheDocument();
  });

  it("places the total before the Discogs handoff action", async () => {
    renderPileSheet([makeListing()]);

    const totalLabel = await screen.findByText("Total");
    const action = await screen.findByRole("button", { name: "Send to Discogs Wantlist" });

    expect(
      totalLabel.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("PileSheet confirmClear flow", () => {
  it("shows Clear button when pile has records", async () => {
    renderPileSheet([makeListing()]);

    expect(await screen.findByText("Clear")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear/ })).toHaveClass(
      "focus-visible:ring-mc-focus",
    );
    expect(screen.getByRole("button", { name: "Close pile" })).toHaveClass(
      "focus-visible:ring-mc-focus",
    );
  });

  it("shows confirmation after clicking Clear", async () => {
    renderPileSheet([makeListing()]);
    expect(await screen.findByText("Clear")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clear"));
    expect(await screen.findByText("Sure?")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("cancels clear when No is clicked", async () => {
    renderPileSheet([makeListing({ title: "Keep Me" })]);
    expect(await screen.findByText("Clear")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clear"));
    expect(await screen.findByText("No")).toBeInTheDocument();
    await userEvent.click(screen.getByText("No"));

    expect(await screen.findByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("Keep Me")).toBeInTheDocument();
    expect(screen.queryByText("Sure?")).toBeNull();
  });

  it("clears pile when Yes is clicked", async () => {
    renderPileSheet([makeListing({ title: "Delete Me" })]);
    expect(await screen.findByText("Clear")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clear"));
    expect(await screen.findByText("Yes")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Yes"));

    expect(await screen.findByText(/no records in your pile yet/i)).toBeInTheDocument();
  });

  it("hides Clear button when pile is empty", () => {
    renderPileSheet([]);
    expect(screen.queryByText("Clear")).toBeNull();
  });

  it("uses touch-sized targets for remove, clear confirmation, and close actions", async () => {
    renderPileSheet([makeListing()]);

    expect(await screen.findByRole("button", { name: /remove.*pile/i })).toHaveClass(
      "h-11",
      "w-11",
    );
    expect(screen.getByRole("button", { name: "Close pile" })).toHaveClass("h-11", "w-11");

    const clear = screen.getByRole("button", { name: /clear.*pile/i });
    expect(clear).toHaveClass("min-h-9", "min-w-11");
    await userEvent.click(clear);

    expect(screen.getByRole("button", { name: "Yes" })).toHaveClass("min-h-9", "min-w-11");
    expect(screen.getByRole("button", { name: "No" })).toHaveClass("min-h-9", "min-w-11");
  });
});

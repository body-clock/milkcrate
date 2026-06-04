import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PileProvider } from "../../contexts/pile_context";
import { ShopperProvider } from "../../contexts/shopper_context";
import { ViewportProvider } from "../../contexts/viewport_context";
import type { Listing } from "../../types/inertia";
import PileSheet from "../pile_sheet";
import { PilePopulator } from "./test_helpers";

const mockedPage = vi.hoisted(() => ({
  shopper: { discogs_username: "shopper1" } as { discogs_username: string } | null,
}));

vi.mock("@inertiajs/react", async () => {
  const actual = await vi.importActual("@inertiajs/react");
  return {
    ...actual,
    usePage: () => ({
      props: {
        store: {
          discogs_username: "test-store",
          name: "Test Store",
          handoff_available: true,
        },
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

const INITIAL_PILE_ID = 1000;
let nextId = INITIAL_PILE_ID;
const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
  id: nextId++,
  discogs_listing_id: `discogs-${nextId}`,
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

function PileSheetInner({ pileRecords }: { pileRecords: Listing[] }) {
  return (
    <PileProvider>
      <PilePopulator pileRecords={pileRecords}>
        <PileSheet open={true} onClose={vi.fn()} />
      </PilePopulator>
    </PileProvider>
  );
}

function renderPileSheet(pileRecords: Listing[]) {
  return render(
    <ViewportProvider>
      <ShopperProvider>
        <PileSheetInner pileRecords={pileRecords} />
      </ShopperProvider>
    </ViewportProvider>,
  );
}

describe("PileSheet Wantlist handoff", () => {
  it("shows the Send to Wantlist button when handoff is available and shopper is connected", async () => {
    renderPileSheet([makeListing()]);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: "Send to Discogs Wantlist" });
      expect(button).toHaveClass("focus-visible:ring-mc-focus");
      expect(button).not.toHaveClass("mc-btn");
    });
  });

  it("shows disclosure text about the store-scoped handoff", async () => {
    renderPileSheet([makeListing()]);

    await waitFor(() => {
      expect(screen.getByText(/Get these records from/)).toBeInTheDocument();
    });
  });

  it("shows connected account status and an explicit disconnect action in a populated pile", async () => {
    renderPileSheet([makeListing()]);

    await waitFor(() => {
      expect(screen.getByText(/Connected to Discogs as @shopper1/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
    });
  });

  it("announces the Wantlist result without making record review live", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ wantlist_url: null, added: 1, skipped: 0 }),
      }),
    );
    const user = userEvent.setup();
    renderPileSheet([makeListing()]);

    await user.click(await screen.findByRole("button", { name: "Send to Discogs Wantlist" }));

    const result = await screen.findByRole("status");
    expect(result).toHaveAttribute("aria-live", "polite");
    expect(result).toHaveClass("text-mc-feedback-success");
    expect(result).toHaveTextContent("1 release added to your Wantlist");
    expect(screen.getByRole("list")).not.toHaveAttribute("aria-live");
  });

  it("shows progress state while Wantlist handoff is in flight", async () => {
    let resolveFetch: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));
    const user = userEvent.setup();
    renderPileSheet([makeListing()]);

    await user.click(await screen.findByRole("button", { name: "Send to Discogs Wantlist" }));

    const progress = await screen.findByText(/Adding to Wantlist/);
    expect(progress.closest("[class*=mc-feedback-progress]")).toBeInTheDocument();

    const inFlightButton = screen.getByRole("button", { name: /Adding to Wantlist…/ });
    expect(inFlightButton).toBeDisabled();
    expect(inFlightButton).toHaveAttribute("aria-busy", "true");

    resolveFetch!({ ok: true, json: async () => ({ wantlist_url: null, added: 1, skipped: 0 }) });
    await screen.findByRole("status");
  });

  it("announces Wantlist handoff errors through semantic danger feedback and recovery action", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const user = userEvent.setup();
    renderPileSheet([makeListing()]);

    await user.click(await screen.findByRole("button", { name: "Send to Discogs Wantlist" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveClass("text-mc-feedback-danger");
    expect(screen.getByRole("button", { name: "Try again" })).toHaveClass(
      "focus-visible:ring-mc-focus",
    );
  });

  it("only presents the connect form for a populated eligible disconnected pile", async () => {
    mockedPage.shopper = null;
    renderPileSheet([makeListing()]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Connect with Discogs" })).toBeInTheDocument();
    });

    const form = screen.getByRole("button", { name: "Connect with Discogs" }).closest("form");
    expect(form?.querySelector("input[name='store_slug']")).toHaveAttribute("value", "test-store");
    expect(screen.getByRole("button", { name: "Connect with Discogs" })).toHaveClass(
      "focus-visible:ring-mc-focus",
    );
    expect(screen.queryByRole("button", { name: "Disconnect" })).not.toBeInTheDocument();
  });

  it("does not show old cart button", async () => {
    renderPileSheet([makeListing()]);

    await waitFor(() => {
      expect(screen.queryByText(/add all to discogs cart/i)).toBeNull();
    });
  });
});

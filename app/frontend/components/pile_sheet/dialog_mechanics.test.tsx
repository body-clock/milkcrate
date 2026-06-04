import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PileProvider } from "../../contexts/pile_context";
import { ShopperProvider } from "../../contexts/shopper_context";
import { ViewportProvider } from "../../contexts/viewport_context";
import PileSheet from "../pile_sheet";

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

describe("PileSheet dialog mechanics", () => {
  it("renders as a dialog with aria-modal", () => {
    render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={vi.fn()} />
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby pointing to pile-sheet-title", () => {
    const onClose = vi.fn();
    render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={onClose} />
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "pile-sheet-title");
    expect(document.getElementById("pile-sheet-title")).toBeInTheDocument();
  });

  it("closes on Escape key", async () => {
    const onClose = vi.fn();
    render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={onClose} />
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on backdrop click", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={onClose} />
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    );
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    if (backdrop) {
      await userEvent.click(backdrop);
    }
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on close button click", async () => {
    const onClose = vi.fn();
    render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={true} onClose={onClose} />
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: /close pile/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render when open is false", () => {
    render(
      <ViewportProvider>
        <ShopperProvider>
          <PileProvider>
            <PileSheet open={false} onClose={vi.fn()} />
          </PileProvider>
        </ShopperProvider>
      </ViewportProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

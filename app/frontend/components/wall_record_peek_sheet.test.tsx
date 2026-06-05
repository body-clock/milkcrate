import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PileProvider } from "../contexts/pile_context";
import { ViewportProvider } from "../contexts/viewport_context";
import type { Listing } from "../types/inertia";
import StorefrontMotionConfig from "./storefront_motion_config";
import WallRecordPeekSheet from "./wall_record_peek_sheet";

const listing: Listing = {
  id: 1,
  discogs_listing_id: "1",
  artist: "The Band",
  title: "Big Sky",
  label: "Label",
  year: 1972,
  format: "LP",
  genres: ["Rock"],
  styles: ["Folk Rock"],
  condition: "VG+",
  price: "18.00",
  currency: "USD",
  cover_image_url: null,
  thumbnail_url: null,
  notes: "A warm, roomy copy.",
  discogs_url: "https://www.discogs.com/sell/item/1",
};

function Harness() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)}>
        Open wall peek
      </button>
      <WallRecordPeekSheet
        open={open}
        listing={listing}
        onClose={() => setOpen(false)}
        returnFocusRef={openerRef}
      />
    </>
  );
}

describe("WallRecordPeekSheet", () => {
  it("renders pile actions and an explicit Discogs handoff", async () => {
    const user = userEvent.setup();

    render(
      <StorefrontMotionConfig>
        <ViewportProvider>
          <PileProvider>
            <WallRecordPeekSheet open listing={listing} onClose={vi.fn()} />
          </PileProvider>
        </ViewportProvider>
      </StorefrontMotionConfig>,
    );

    expect(screen.getByRole("dialog", { name: "Record peek" })).toBeInTheDocument();
    expect(screen.getByText("Big Sky")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Pile" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /View listing for Big Sky on Discogs/i }),
    ).toHaveAttribute("target", "_blank");

    await user.click(screen.getByRole("button", { name: "+ Pile" }));

    expect(screen.getByRole("button", { name: "✓ In pile" })).toBeInTheDocument();
  });

  it("returns focus to the opener when the sheet closes", async () => {
    const user = userEvent.setup();

    render(
      <StorefrontMotionConfig>
        <ViewportProvider>
          <PileProvider>
            <Harness />
          </PileProvider>
        </ViewportProvider>
      </StorefrontMotionConfig>,
    );

    const opener = screen.getByRole("button", { name: "Open wall peek" });
    await user.click(opener);

    expect(screen.getByRole("dialog", { name: "Record peek" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(opener).toHaveFocus());
  });
});

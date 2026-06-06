/**
 * Shared test utilities for PileSheet tests.
 *
 * This module intentionally does NOT import from vitest to avoid
 * hoisting/mock-order issues. Test files must set up their own
 * vi.mock("@inertiajs/react") and beforeEach/afterEach hooks.
 */

import { render, type RenderResult } from "@testing-library/react";
import React from "react";

import { PileProvider } from "../../contexts/pile_context";
import { ShopperProvider } from "../../contexts/shopper_context";
import { ViewportProvider } from "../../contexts/viewport_context";
import type { Listing } from "../../types/inertia";
import PileSheet from "../../components/pile_sheet";
import { PilePopulator } from "../../components/pile_sheet/test_helpers";

const INITIAL_PILE_ID = 1000;
let nextId = INITIAL_PILE_ID;

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
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
  };
}

interface PileSheetInnerProps {
  pileRecords: Listing[];
  onClose?: () => void;
}

function PileSheetInner({ pileRecords, onClose }: PileSheetInnerProps) {
  return (
    <PileProvider>
      <PilePopulator pileRecords={pileRecords}>
        <PileSheet open={true} onClose={onClose ?? (() => {})} />
      </PilePopulator>
    </PileProvider>
  );
}

export function renderPileSheet(pileRecords: Listing[], onClose?: () => void): RenderResult {
  return render(
    <ViewportProvider>
      <ShopperProvider>
        <PileSheetInner pileRecords={pileRecords} onClose={onClose} />
      </ShopperProvider>
    </ViewportProvider>,
  );
}

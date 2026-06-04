import { vi } from "vitest";

import { PileProvider } from "../../../contexts/pile_context";
import { renderWithTier } from "../../../test/viewport-test-utils";
import type { Crate, Listing } from "../../../types/inertia";
import CrateView from "../../crate_view";
import StorefrontMotionConfig from "../../storefront_motion_config";

export const makeListing = (overrides: Partial<Listing> = {}): Listing => ({
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

export const makeCrates = (): Crate[] => [
  {
    slug: "jazz",
    name: "Jazz",
    count: 3,
    records: [
      makeListing({ id: 1, title: "First Jazz", artist: "One" }),
      makeListing({ id: 2, title: "Second Jazz", artist: "Two" }),
      makeListing({ id: 3, title: "Third Jazz", artist: "Three" }),
    ],
  },
  {
    slug: "rock",
    name: "Rock",
    count: 1,
    records: [makeListing({ id: 4, title: "Rock Record", artist: "Four" })],
  },
];

export function renderCrateView(
  tier: "compact" | "comfy" | "wide",
  props: Partial<React.ComponentProps<typeof CrateView>> = {},
) {
  const defaultProps: React.ComponentProps<typeof CrateView> = {
    crates: makeCrates(),
    activeSlug: "jazz",
    onSelectCrate: vi.fn(),
    onBack: vi.fn(),
    ...props,
  };

  return {
    ...renderWithTier(
      tier,
      <StorefrontMotionConfig>
        <PileProvider>
          <CrateView {...defaultProps} />
        </PileProvider>
      </StorefrontMotionConfig>,
    ),
    props: defaultProps,
  };
}

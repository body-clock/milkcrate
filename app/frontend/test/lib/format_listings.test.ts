import { describe, expect, it } from "vitest";

import { storeListingText } from "@/lib/format_listings";

describe("storeListingText", () => {
  it("formats plural listings", () => {
    expect(storeListingText(100)).toBe("100 listings");
  });

  it("formats singular listing", () => {
    expect(storeListingText(1)).toBe("1 listing");
  });

  it("formats zero listings", () => {
    expect(storeListingText(0)).toBe("0 listings");
  });

  it("formats large numbers with locale separators", () => {
    expect(storeListingText(1234567)).toBe("1,234,567 listings");
  });

  it("returns 'Listings coming soon' for null", () => {
    expect(storeListingText(null)).toBe("Listings coming soon");
  });
});

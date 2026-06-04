import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Crate } from "../types/inertia";
import CrateChipBar from "./crate_chip_bar";

const crates: Crate[] = [
  { slug: "jazz", name: "Jazz", count: 12, records: [] },
  { slug: "rock", name: "Rock", count: 8, records: [] },
  { slug: "soul", name: "Soul", count: 5, records: [] },
];

describe("CrateChipBar", () => {
  it("renders chips without selection when no active slug", () => {
    render(
      <CrateChipBar
        title="Featured"
        description="Featured bins from this store's inventory."
        crates={crates}
        activeSlug={null}
        onSelectCrate={vi.fn()}
      />,
    );

    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText(/Featured bins from this store's inventory/i)).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Crates" })).toBeInTheDocument();
    // No chip should be selected when activeSlug is null
    expect(screen.getByRole("tab", { name: "Jazz" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Rock" })).toHaveAttribute("aria-selected", "false");
  });

  it("marks the active chip and calls back when a different chip is chosen", async () => {
    const user = userEvent.setup();
    const onSelectCrate = vi.fn();

    render(
      <CrateChipBar
        title="Genres"
        description="Inventory grouped by genre."
        crates={crates}
        activeSlug="rock"
        onSelectCrate={onSelectCrate}
      />,
    );

    expect(screen.getByRole("tab", { name: "Rock" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Soul" }));

    expect(onSelectCrate).toHaveBeenCalledWith("soul");
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CrateChipBar from "./crate_chip_bar";
import type { Crate } from "../types/inertia";

const crates: Crate[] = [
  { slug: "jazz", name: "Jazz", count: 12, records: [] },
  { slug: "rock", name: "Rock", count: 8, records: [] },
  { slug: "soul", name: "Soul", count: 5, records: [] },
];

describe("CrateChipBar", () => {
  it("renders the label copy and the first chip when nothing is active", () => {
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
    expect(screen.getByRole("tab", { name: "Jazz" })).toHaveAttribute("aria-selected", "true");
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

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Crate } from "../types/inertia";
import CrateTabs from "./crate_tabs";

const crates: Crate[] = [
  { slug: "jazz", name: "Jazz", count: 12, records: [] },
  { slug: "rock", name: "Rock", count: 8, records: [] },
  { slug: "soul", name: "Soul", count: 5, records: [] },
];

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

afterEach(() => {
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

describe("CrateTabs", () => {
  it("keeps compact crate tabs large enough for touch selection", () => {
    render(<CrateTabs crates={crates} activeSlug="jazz" onSelect={vi.fn()} compact />);

    expect(screen.getByRole("tab", { name: "Jazz" })).toHaveClass("min-h-11");
  });

  it("centers the selected crate tab in the scroll row when selection changes", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    const { rerender } = render(<CrateTabs crates={crates} activeSlug="jazz" onSelect={vi.fn()} />);

    scrollIntoView.mockClear();

    rerender(<CrateTabs crates={crates} activeSlug="soul" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Soul" })).toHaveAttribute("aria-selected", "true");
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  });
});

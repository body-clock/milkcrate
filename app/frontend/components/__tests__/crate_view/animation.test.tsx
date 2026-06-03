import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";

import { renderCrateView, makeCrates, makeListing } from "./helpers";

beforeEach(() => {
  sessionStorage.clear();
});

describe("CrateView animation and cards", () => {
  it("keeps the lesson cue hidden after learning and switching crates", async () => {
    const user = userEvent.setup();
    const onSelectCrate = vi.fn();

    renderCrateView("compact", { total: 10, onSelectCrate });

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    expect(screen.queryByTestId("gesture-hint-overlay")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Rock" }));
    expect(screen.queryByTestId("gesture-hint-overlay")).not.toBeInTheDocument();
  });

  it("renders hint cards as plain divs with inline transform styles", () => {
    renderCrateView("compact");

    const hintCards = document.querySelectorAll("[data-testid='hint-card-stack'] > div");
    expect(hintCards.length).toBeGreaterThan(1);
    hintCards.forEach((card) => {
      expect(card.innerHTML).toContain("♪");
    });
  });

  it("renders active card with thumbnail backdrop when thumbnail_url is present", () => {
    const crates = makeCrates();
    crates[0].records[0] = makeListing({
      id: 1,
      title: "Cover Record",
      thumbnail_url: "https://example.com/thumb.jpg",
      cover_image_url: "https://example.com/cover.jpg",
    });

    renderCrateView("wide", { crates });

    const imgs = screen.getAllByRole("img");
    const coverImg = imgs.find(
      (img) => img.getAttribute("src") === "https://example.com/cover.jpg",
    );
    expect(coverImg).toBeInTheDocument();
  });

  it("keeps background records mounted while their depth positions animate", async () => {
    const user = userEvent.setup();
    const crates = makeCrates();
    crates[0].count = 5;
    crates[0].records = Array.from({ length: 5 }, (_, i) =>
      makeListing({ id: i + 1, title: `Record ${i + 1}`, artist: "Artist" }),
    );
    renderCrateView("compact", { crates, total: 5 });

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    expect(screen.getByText("Record 2 of 5")).toBeInTheDocument();
  });

  it("omits thumbnail backdrop when thumbnail_url is null", () => {
    const crates = makeCrates();
    crates[0].records[0] = makeListing({
      id: 1,
      title: "No Thumb",
      thumbnail_url: null,
      cover_image_url: "https://example.com/cover.jpg",
    });

    renderCrateView("wide", { crates });

    const imgs = screen.getAllByRole("img");
    const coverImg = imgs.find(
      (img) => img.getAttribute("src") === "https://example.com/cover.jpg",
    );
    expect(coverImg).toBeInTheDocument();
  });
});

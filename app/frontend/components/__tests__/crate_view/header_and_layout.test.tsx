import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { renderCrateView, makeCrates, makeListing } from "./helpers";

beforeEach(() => {
  sessionStorage.clear();
});

describe("CrateView header and layout", () => {
  it("renders a compact mobile header with active crate context", () => {
    renderCrateView("compact");

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument();
    expect(screen.getByText("3 records")).toBeInTheDocument();
  });

  it("leaves compact tabs and browsing controls in content when the storefront header owns crate identity", () => {
    renderCrateView("compact", { compactHeaderOwnedByLayout: true });

    expect(screen.queryByRole("button", { name: "Back to store" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Jazz" })).not.toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Crates" })).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" }),
    ).toBeInTheDocument();
  });

  it("keeps desktop details visible on wide viewports", () => {
    renderCrateView("wide");

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
    expect(screen.getAllByText("One").length).toBeGreaterThan(1);

    const discogsLinks = screen.getAllByRole("link", { name: /Discogs/ });
    expect(discogsLinks.length).toBeGreaterThanOrEqual(1);
    discogsLinks.forEach((link) => expect(link).toHaveClass("focus-visible:ring-mc-focus"));
  });

  it("renders score direction using semantic success and danger roles", async () => {
    const user = userEvent.setup();
    const crates = makeCrates();
    crates[0].records[0] = makeListing({ id: 1, score_breakdown: { freshness: 2, noise: -1 } });

    renderCrateView("wide", { crates });
    await user.click(screen.getByRole("button", { name: "Score" }));

    expect(screen.getByText("+2.0")).toHaveClass("text-mc-feedback-success");
    expect(screen.getByText("-1.0")).toHaveClass("text-mc-feedback-danger");
    expect(screen.getByText(/^\+?1\.0$/)).toHaveClass("text-mc-feedback-success");
  });

  it("calls onBack from the compact back control", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderCrateView("compact", { onBack });

    await user.click(screen.getByRole("button", { name: "Back to store" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("keeps crate tab selection working in compact presentation", async () => {
    const user = userEvent.setup();
    const onSelectCrate = vi.fn();
    renderCrateView("compact", { onSelectCrate });

    await user.click(screen.getByRole("tab", { name: "Rock" }));
    expect(onSelectCrate).toHaveBeenCalledWith("rock");
  });

  it("preserves compact header context when tabs are hidden", () => {
    renderCrateView("compact", { hideTabs: true });

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
  });

  it("uses compact stack sizing without dropping the progress indicator", () => {
    renderCrateView("compact");

    expect(screen.getByTestId("crate-stack")).toHaveAttribute("data-viewport", "compact");
    expect(
      screen.getByRole("progressbar", { name: "Record 1 of 3, front to deeper" }),
    ).toBeInTheDocument();
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderCrateView } from "./helpers";

beforeEach(() => {
  sessionStorage.clear();
});

const EMPTY_CRATES = [
  { slug: "jazz", name: "Jazz", count: 0, records: [] },
  { slug: "rock", name: "Rock", count: 0, records: [] },
];

describe("CrateView empty state", () => {
  it("renders the compact empty-crate state with header context and empty message", () => {
    renderCrateView("compact", { crates: EMPTY_CRATES, activeSlug: "jazz" });

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jazz" })).toBeInTheDocument();
    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
  })

  it("hides tabs in compact empty-crate state when hideTabs is true", () => {
    renderCrateView("compact", { crates: EMPTY_CRATES, activeSlug: "jazz", hideTabs: true });

    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
  })

  it("preserves compact empty-state tab guards when the storefront header owns crate identity", () => {
    renderCrateView("compact", {
      crates: EMPTY_CRATES,
      activeSlug: "jazz",
      compactHeaderOwnedByLayout: true,
    });

    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Crates" })).toBeInTheDocument();
  })

  it("renders no riffle controls in compact empty-crate state", () => {
    renderCrateView("compact", { crates: EMPTY_CRATES, activeSlug: "jazz" });

    expect(screen.queryByRole("button", { name: /front/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /deeper/i })).not.toBeInTheDocument();
  })

  it("renders active crate heading and record count on wide viewports", () => {
    renderCrateView("wide", { crates: EMPTY_CRATES, activeSlug: "jazz" });

    expect(screen.getByText("Jazz")).toBeInTheDocument();
    expect(screen.getByText("0 records")).toBeInTheDocument();
  })

  it("renders back control on wide viewports", () => {
    renderCrateView("wide", { crates: EMPTY_CRATES, activeSlug: "jazz" });

    expect(screen.getByRole("button", { name: "Back to store" })).toBeInTheDocument();
  })

  it("hides tabs on wide populated state when hideTabs is true", () => {
    renderCrateView("wide", { hideTabs: true });

    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
  })

  it("hides tabs on wide empty-crate state when hideTabs is true", () => {
    renderCrateView("wide", { crates: EMPTY_CRATES, activeSlug: "jazz", hideTabs: true });

    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Crates" })).not.toBeInTheDocument();
  })

  it("renders the wide empty-crate state with header context", () => {
    renderCrateView("wide", { crates: EMPTY_CRATES, activeSlug: "jazz" });

    expect(screen.getByText(/nothing here/i)).toBeInTheDocument();
  })

  it("renders no riffle controls in wide empty-crate state", () => {
    renderCrateView("wide", { crates: EMPTY_CRATES, activeSlug: "jazz" });

    expect(screen.queryByRole("button", { name: /front/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /deeper/i })).not.toBeInTheDocument();
  })
})

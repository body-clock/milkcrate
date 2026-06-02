import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderCrateView, makeCrates, makeListing } from "./helpers";

beforeEach(() => {
  sessionStorage.clear();
});

describe("CrateView navigation", () => {
  it("clicking the deeper control advances one record and dismisses the gesture hint", async () => {
    const user = userEvent.setup();
    renderCrateView("compact", { total: 10 });

    expect(screen.queryByTestId("gesture-hint-overlay")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    expect(screen.getByText("Record 2 of 10")).toBeInTheDocument();
    expect(screen.queryByTestId("gesture-hint-overlay")).not.toBeInTheDocument();
  })

  it("clicking the front control from record two returns to record one", async () => {
    const user = userEvent.setup();
    const crates = makeCrates();
    crates[0].count = 10;
    crates[0].records = Array.from({ length: 10 }, (_, i) =>
      makeListing({ id: i + 1, title: `Record ${i + 1}`, artist: "Artist" }),
    );
    renderCrateView("compact", { crates, total: 10 });

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    expect(screen.getByText("Record 2 of 10")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /front/i }));
    expect(screen.getByText("Record 1 of 10")).toBeInTheDocument();
  })

  it("does not dismiss the compact hint when front navigation is blocked", async () => {
    const user = userEvent.setup();
    renderCrateView("compact", { activeSlug: "rock", total: 1 });

    const hint = screen.queryByTestId("gesture-hint-overlay");
    expect(hint).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /front/i }));
    expect(screen.queryByTestId("gesture-hint-overlay")).toBeInTheDocument();
  })

  it("keeps front and deeper controls labeled while disabled at crate edges", () => {
    renderCrateView("compact", { activeSlug: "rock", total: 1 });

    expect(screen.getByRole("button", { name: /front/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /deeper/i })).toBeDisabled();
  })

  it("announces the deeper edge without changing records", async () => {
    const user = userEvent.setup();
    renderCrateView("compact", { activeSlug: "rock", total: 1 });

    await user.click(screen.getByRole("button", { name: /deeper/i }));

    expect(screen.getByText("Record 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/front/i);
  })

  it("navigates with the ref-based index to avoid stale closures", async () => {
    const user = userEvent.setup();
    const crates = makeCrates();
    crates[0].count = 5;
    crates[0].records = Array.from({ length: 5 }, (_, i) =>
      makeListing({ id: i + 1, title: `Record ${i + 1}`, artist: "Artist" }),
    );
    renderCrateView("compact", { crates, total: 5 });

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    await user.click(screen.getByRole("button", { name: /deeper/i }));
    await user.click(screen.getByRole("button", { name: /deeper/i }));
    await user.click(screen.getByRole("button", { name: /deeper/i }));

    expect(screen.getByText("Record 5 of 5")).toBeInTheDocument();
  })

  it("ArrowDown advances deeper and ArrowUp returns toward the front", async () => {
    const user = userEvent.setup();
    renderCrateView("compact", { total: 10 });

    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Record 2 of 10")).toBeInTheDocument();

    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Record 1 of 10")).toBeInTheDocument();
  })

  it("navigates deeper and front with the semantic button labels", async () => {
    const user = userEvent.setup();
    renderCrateView("compact", { total: 5 });

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    expect(screen.getByText("Record 2 of 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /front/i }));
    expect(screen.getByText("Record 1 of 5")).toBeInTheDocument();
  })

  it("keeps navigation decisions unchanged when reduced motion is requested", async () => {
    const user = userEvent.setup();
    renderCrateView("compact", { total: 10 });

    await user.click(screen.getByRole("button", { name: /deeper/i }));
    expect(screen.getByText("Record 2 of 10")).toBeInTheDocument();
  })
})

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconBackButton, TextBackButton } from "./back_button";

describe("IconBackButton", () => {
  it("renders with default aria-label", () => {
    const onClick = vi.fn();
    render(<IconBackButton onClick={onClick} />);

    const btn = screen.getByRole("button", { name: "Back" });
    expect(btn).toBeDefined();
    expect(btn.querySelector("[aria-hidden]")?.textContent).toContain("←");
  });

  it("renders with labelled aria-label", () => {
    const onClick = vi.fn();
    render(<IconBackButton onClick={onClick} label="Store" />);

    const btn = screen.getByRole("button", { name: "Back to Store" });
    expect(btn).toBeDefined();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconBackButton onClick={onClick} />);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("TextBackButton", () => {
  it("renders with label", () => {
    const onClick = vi.fn();
    render(<TextBackButton onClick={onClick} label="Store" />);

    const btn = screen.getByRole("button", { name: "Back to Store" });
    expect(btn.textContent).toContain("Store");
  });

  it("falls back to 'Back' without label", () => {
    const onClick = vi.fn();
    render(<TextBackButton onClick={onClick} />);

    const btn = screen.getByRole("button", { name: "Back" });
    expect(btn.textContent).toContain("Back");
  });
});

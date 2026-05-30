import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscogsConnectForm, DiscogsDisconnectForm } from "./discogs_connection_controls";

describe("Discogs connection controls", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="csrf-token" content="csrf-token-test" />';
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("submits the existing shopper authorization contract for a store", () => {
    render(<DiscogsConnectForm storeSlug="philadelphiamusic" />);

    const form = screen.getByRole("button", { name: "Connect with Discogs" }).closest("form");
    expect(form).toHaveAttribute("method", "POST");
    expect(form).toHaveAttribute("action", "/auth/discogs/shopper/authorize");
    expect(form?.querySelector("input[name='authenticity_token']")).toHaveAttribute(
      "value",
      "csrf-token-test",
    );
    expect(form?.querySelector("input[name='store_slug']")).toHaveAttribute(
      "value",
      "philadelphiamusic",
    );
    expect(screen.getByRole("button", { name: "Connect with Discogs" })).toHaveClass(
      "focus-visible:ring-mc-focus",
    );
    expect(screen.getByRole("button", { name: "Connect with Discogs" })).not.toHaveClass("mc-btn");
  });

  it("submits the existing shopper disconnect contract without hover interaction", () => {
    render(<DiscogsDisconnectForm />);

    const form = screen.getByRole("button", { name: "Disconnect" }).closest("form");
    expect(form).toHaveAttribute("method", "POST");
    expect(form).toHaveAttribute("action", "/auth/discogs/shopper/disconnect");
    expect(form?.querySelector("input[name='authenticity_token']")).toHaveAttribute(
      "value",
      "csrf-token-test",
    );
    expect(form?.querySelector("input[name='_method']")).toHaveAttribute("value", "delete");
    expect(screen.getByRole("button", { name: "Disconnect" })).toHaveClass(
      "focus-visible:ring-mc-focus",
    );
    expect(screen.getByRole("button", { name: "Disconnect" })).not.toHaveClass("mc-btn");
  });
});

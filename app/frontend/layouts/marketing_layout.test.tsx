import { render, screen, within } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ViewportTier } from "@/contexts/viewport_context";
import { renderWithTier } from "@/test/viewport-test-utils";

const VIEWPORT_COMPACT = 390;

import MarketingLayout from "./marketing_layout";
import { MarketingLayoutContent } from "./marketing_layout_content";

vi.mock("@inertiajs/react", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePage: () => ({ props: {} }),
}));

function renderAtWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });

  return render(
    <MarketingLayout>
      <p>Public content</p>
    </MarketingLayout>,
  );
}

function renderContentAtTier(tier: ViewportTier) {
  return renderWithTier(
    tier,
    <MarketingLayoutContent>
      <p>Public content</p>
    </MarketingLayoutContent>,
  );
}

describe("MarketingLayout header policy", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it.each(["comfy", "wide"] as const)("shows brand and theme toggle at the %s tier", (tier) => {
    renderContentAtTier(tier);

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Milkcrate home" })).toBeInTheDocument();
    expect(
      within(header).getByRole("button", { name: "Toggle light/dark mode" }),
    ).toBeInTheDocument();
  });

  it("renders only the Milkcrate home link in compact public header chrome", () => {
    renderContentAtTier("compact");

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Milkcrate home" })).toBeInTheDocument();
    expect(
      within(header).queryByRole("button", { name: "Toggle light/dark mode" }),
    ).not.toBeInTheDocument();
  });

  it("applies compact policy through the production viewport provider", () => {
    renderAtWidth(VIEWPORT_COMPACT);

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: "Milkcrate home" })).toBeInTheDocument();
    expect(
      within(header).queryByRole("button", { name: "Toggle light/dark mode" }),
    ).not.toBeInTheDocument();
  });
});

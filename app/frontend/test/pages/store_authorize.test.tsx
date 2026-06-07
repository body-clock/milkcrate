import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import StoreAuthorize from "../../pages/stores/authorize";

const STORE = {
  name: "Ryvvvolte Records",
  discogs_username: "ryvvolte_records",
  total_listings: 725,
  storefront_path: "/ryvvolte_records",
};

beforeEach(() => {
  const meta = document.createElement("meta");
  meta.name = "csrf-token";
  meta.content = "csrf-token-test";
  document.head.appendChild(meta);
});

it("explains the existing-store OAuth upgrade and posts to the authorize endpoint", () => {
  render(<StoreAuthorize store={STORE} />);

  expect(
    screen.getByRole("heading", { name: "Claim your Milkcrate storefront" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Your preview is already live.")).toBeInTheDocument();

  const button = screen.getByRole("button", { name: "Authorize with Discogs" });
  const form = button.closest("form");

  expect(form).toHaveAttribute("action", "/ryvvolte_records/authorize");
  expect(form).toHaveAttribute("method", "POST");
  expect(form?.querySelector("input[name='authenticity_token']")).toHaveAttribute(
    "value",
    "csrf-token-test",
  );
  expect(screen.getByRole("link", { name: "View current storefront" })).toHaveAttribute(
    "href",
    "/ryvvolte_records",
  );
});

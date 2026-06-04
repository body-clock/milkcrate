import type { Listing } from "../../types/inertia";

export interface CardAriaProps {
  roleAttr: "button" | undefined;
  tabAttr: number | undefined;
  pressedAttr: boolean | undefined;
  label: string | undefined;
}

export function buildCardAria(canFlip: boolean, flipped: boolean, listing: Listing): CardAriaProps {
  return {
    roleAttr: canFlip ? ("button" as const) : undefined,
    tabAttr: canFlip ? 0 : undefined,
    pressedAttr: canFlip ? flipped : undefined,
    label: canFlip
      ? `${flipped ? "Show cover for" : "Show details for"} ${listing.title ?? "record"}`
      : undefined,
  };
}

import type { Listing } from "@/types/inertia"

/**
 * Format a listing's display price. Prefers `display_price` when the
 * backend provides it (pre-formatted). Falls back to parsing `price` with
 * currency symbol detection.
 *
 * Returns "—" when no price is available.
 */
export function formatPrice(listing: Listing): string {
  if (listing.display_price && listing.display_price.length > 0) {
    return listing.display_price
  }

  return formatPriceValue(listing.price, listing.currency)
}

/**
 * Format a raw price string and currency to a display string.
 *
 * Returns "—" when price is null, undefined, or empty.
 */
export function formatPriceValue(
  price: string | null | undefined,
  currency: string = "USD",
): string {
  if (!price) {return "—"}

  const num = parseFloat(price)
  if (isNaN(num)) {return "—"}

  const symbol = currencySymbol(currency)
  return `${symbol}${num.toFixed(2)}`
}

function currencySymbol(currency: string): string {
  if (currency === "GBP") {return "£"}
  if (currency === "EUR") {return "€"}
  return "$"
}

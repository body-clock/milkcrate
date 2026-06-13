export function storeListingText(total: number | null): string {
  if (total == null) {
    return "Listings coming soon";
  }
  return `${total.toLocaleString()} listing${total === 1 ? "" : "s"}`;
}

/**
 * Returns the CSRF token from the meta tag in the document head.
 * Returns empty string if not found (SSR-safe).
 */
export function csrfToken(): string {
  if (typeof document === "undefined") return "";

  return document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content ?? "";
}

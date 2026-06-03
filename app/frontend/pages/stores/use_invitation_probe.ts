import { useEffect, useMemo } from "react";

import { useDiscogsLookup } from "@/hooks/use_discogs_lookup";
import type { LookupState } from "@/hooks/use_discogs_lookup";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 40;
const RESERVED_SLUGS = [
  "admin",
  "apply",
  "jobs",
  "up",
  "assets",
  "404",
  "500",
  "health",
  "login",
  "logout",
  "signup",
  "register",
  "api",
  "docs",
  "status",
  "help",
  "support",
  "favicon",
  "manifest",
  "service-worker",
] as const;
const STATUSES_WITH_RESULT = new Set(["preview", "error_active_store", "error_applicant"]);

function getCsrfToken(): string | undefined {
  return typeof document === "undefined"
    ? undefined
    : document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;
}

function validateSlug(slug: string): boolean {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {
    return false;
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(slug)) {
    return false;
  }
  return !RESERVED_SLUGS.includes(slug.toLowerCase() as (typeof RESERVED_SLUGS)[number]);
}

function computeDisplayStatus(
  shouldProbe: boolean,
  slug: string,
  state: LookupState,
): "loading" | "found" | "not_found" {
  if (!shouldProbe || !validateSlug(slug)) {
    return "not_found";
  }
  if (state.status === "loading" || state.status === "idle") {
    return "loading";
  }
  if (STATUSES_WITH_RESULT.has(state.status)) {
    return "found";
  }
  return "not_found";
}

function computeSellerName(slug: string, state: LookupState): string | null {
  if (!STATUSES_WITH_RESULT.has(state.status)) {
    return null;
  }
  if ("result" in state && state.result && "seller_name" in state.result) {
    return state.result.seller_name || slug;
  }
  return slug;
}

interface InvitationProbeResult {
  displayStatus: "loading" | "found" | "not_found";
  sellerName: string | null;
  csrfToken: string | undefined;
}

export function useInvitationProbe(slug: string): InvitationProbeResult {
  const { state, lookup } = useDiscogsLookup();
  const csrfToken = getCsrfToken();
  const shouldProbe = useMemo(() => validateSlug(slug), [slug]);

  useEffect(() => {
    if (shouldProbe) {
      lookup(slug);
    }
  }, [slug, shouldProbe, lookup]);

  return {
    displayStatus: computeDisplayStatus(shouldProbe, slug, state),
    sellerName: computeSellerName(slug, state),
    csrfToken,
  };
}

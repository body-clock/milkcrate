import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import MarketingLayout from "@/layouts/marketing_layout";
import BrandMark from "@/components/brand_mark";
import { springTactile } from "@/lib/motion_tokens";
import { useDiscogsLookup } from "@/hooks/use_discogs_lookup";
import type { LookupState } from "@/hooks/use_discogs_lookup";
import InvitationLoading from "./invitation_loading";
import InvitationFound from "./invitation_found";
import InvitationNoMatch from "./invitation_no_match";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 40;
const RESERVED_SLUGS = [
  "admin", "apply", "jobs", "up", "assets",
  "404", "500", "health", "login", "logout",
  "signup", "register", "api", "docs",
  "status", "help", "support", "favicon",
  "manifest", "service-worker",
] as const;
const STATUSES_WITH_RESULT = new Set(["preview", "error_active_store", "error_applicant"]);

function validateSlug(slug: string): boolean {
  if (slug.length < SLUG_MIN_LENGTH || slug.length > SLUG_MAX_LENGTH) {return false;}
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(slug)) {return false;}
  return !RESERVED_SLUGS.includes(slug.toLowerCase() as typeof RESERVED_SLUGS[number]);
}

function computeDisplayStatus(
  shouldProbe: boolean,
  slug: string,
  state: LookupState,
): "loading" | "found" | "not_found" {
  if (!shouldProbe || !validateSlug(slug)) {return "not_found";}

  if (state.status === "loading" || state.status === "idle") {return "loading";}
  if (STATUSES_WITH_RESULT.has(state.status)) {return "found";}

  return "not_found";
}

function computeSellerName(slug: string, state: LookupState): string | null {
  if (!STATUSES_WITH_RESULT.has(state.status)) {return null;}

  if ("result" in state && state.result && "seller_name" in state.result) {
    return state.result.seller_name || slug;
  }

  return slug;
}

export default function InvitationContent({
  slug,
  oauth_available,
}: {
  slug: string;
  oauth_available?: boolean;
}) {
  const { state, lookup } = useDiscogsLookup();
  const csrfToken =
    typeof document !== "undefined"
      ? document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
      : undefined;

  const shouldProbe = useMemo(() => validateSlug(slug), [slug]);

  useEffect(() => {
    if (shouldProbe) {lookup(slug);}
  }, [slug, shouldProbe, lookup]);

  const displayStatus = computeDisplayStatus(shouldProbe, slug, state);
  const sellerName = computeSellerName(slug, state);

  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springTactile}
          className="mb-6"
        >
          <BrandMark size="large" />
        </motion.div>
        {displayStatus === "loading" && <InvitationLoading />}
        {displayStatus === "found" && (
          <InvitationFound
            slug={slug}
            oauth_available={oauth_available}
            sellerName={sellerName}
            csrfToken={csrfToken}
          />
        )}
        {displayStatus === "not_found" && <InvitationNoMatch />}
      </div>
    </MarketingLayout>
  );
}

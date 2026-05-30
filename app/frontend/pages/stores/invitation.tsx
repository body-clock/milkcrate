import { useEffect, useMemo } from "react";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import MarketingLayout from "@/layouts/marketing_layout";
import BrandMark from "@/components/brand_mark";
import Spinner from "@/components/spinner";
import Button from "@/components/ui/button";
import FeedbackMessage from "@/components/ui/feedback_message";
import { actionClassName } from "@/components/ui/action";
import { springTactile } from "@/lib/motion_tokens";
import { useDiscogsLookup } from "@/hooks/use_discogs_lookup";
import type { InvitationProps } from "@/types/inertia";

export default function Invitation({ waitlist_present, slug, oauth_available }: InvitationProps) {
  // Waitlist acknowledgment — no probe, static page
  if (waitlist_present) {
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
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-2xl font-bold text-mc-text mb-3"
          >
            This URL has been claimed
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-sm text-mc-text-dim leading-relaxed max-w-sm"
          >
            We'll notify the applicant when their storefront is ready. In the meantime, feel free to
            explore other storefronts on Milkcrate.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mt-8"
          >
            <Link href="/" className={actionClassName({ size: "lg", className: "tracking-wide" })}>
              Browse storefronts
            </Link>
          </motion.div>
        </div>
      </MarketingLayout>
    );
  }

  // Invitation page — async Discogs probe
  return <InvitationContent slug={slug} oauth_available={oauth_available} />;
}

function InvitationContent({ slug, oauth_available }: { slug: string; oauth_available?: boolean }) {
  const { state, lookup } = useDiscogsLookup();
  const csrfToken = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;

  const shouldProbe = useMemo(() => {
    if (slug.length < 3 || slug.length > 40) return false;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(slug)) return false;
    const reserved = [
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
    ];
    return !reserved.includes(slug.toLowerCase());
  }, [slug]);

  useEffect(() => {
    if (shouldProbe) lookup(slug);
  }, [slug, shouldProbe, lookup]);

  const displayStatus: "loading" | "found" | "not_found" = !shouldProbe
    ? "not_found"
    : state.status === "loading" || state.status === "idle"
      ? "loading"
      : state.status === "preview" ||
          state.status === "error_active_store" ||
          state.status === "error_applicant"
        ? "found"
        : "not_found";

  const sellerName =
    state.status === "preview" ||
    state.status === "error_active_store" ||
    state.status === "error_applicant"
      ? state.result.seller_name || slug
      : null;

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

function InvitationLoading() {
  return (
    <FeedbackMessage
      tone="progress"
      live="polite"
      className="flex flex-col items-center border-0 bg-transparent"
    >
      <Spinner size="lg" className="mb-4" />
      <p>Checking if this URL is available...</p>
    </FeedbackMessage>
  );
}

function InvitationFound({
  slug,
  oauth_available,
  sellerName,
  csrfToken,
}: {
  slug: string;
  oauth_available?: boolean;
  sellerName: string | null;
  csrfToken: string | undefined;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-2xl font-bold text-mc-text mb-3"
      >
        We found <span className="text-mc-accent">{sellerName}</span> on Discogs
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
      >
        This URL could be your storefront. Claim it to show your Discogs inventory as a browsable,
        curated record store.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="space-y-3"
      >
        {oauth_available ? (
          <form action={`/${slug}/authorize`} method="POST" className="inline">
            {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
            <Button type="submit" size="lg" className="tracking-wide">
              Claim with Discogs
            </Button>
          </form>
        ) : (
          <Link
            href={`/apply?discogs_username=${encodeURIComponent(slug)}`}
            className={actionClassName({ size: "lg", className: "tracking-wide" })}
          >
            Claim this storefront
          </Link>
        )}
        <div>
          <Link
            href={`/apply?discogs_username=${encodeURIComponent(slug)}`}
            className="text-xs text-mc-text-dim hover:text-mc-accent transition-colors"
          >
            Or apply via waitlist
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InvitationNoMatch() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-2xl font-bold text-mc-text mb-3"
      >
        This page is available
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
      >
        If you sell records on Discogs, you can turn this URL into your own browsable storefront on
        Milkcrate.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Link href="/apply" className={actionClassName({ size: "lg", className: "tracking-wide" })}>
          Apply to join
        </Link>
      </motion.div>
    </motion.div>
  );
}

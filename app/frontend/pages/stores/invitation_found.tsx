import { motion } from "framer-motion";
import { Link } from "@inertiajs/react";
import Button from "@/components/ui/button";
import { actionClassName } from "@/components/ui/action";

const fadeIn = { opacity: 0, y: 8 };
const fadeAnim = { opacity: 1, y: 0 };
const delay1 = { delay: 0.1, duration: 0.3 };
const delay2 = { delay: 0.2, duration: 0.3 };
const delay3 = { delay: 0.3, duration: 0.3 };

function ClaimForm({ slug, csrfToken }: { slug: string; csrfToken: string | undefined }) {
  return (
    <form action={`/${slug}/authorize`} method="POST" className="inline">
      {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
      <Button type="submit" size="lg" className="tracking-wide">
        Claim with Discogs
      </Button>
    </form>
  );
}

function ClaimLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/apply?discogs_username=${encodeURIComponent(slug)}`}
      className={actionClassName({ size: "lg", className: "tracking-wide" })}
    >
      Claim this storefront
    </Link>
  );
}

function ClaimCta({ slug, oauth_available, csrfToken }: { slug: string; oauth_available?: boolean; csrfToken: string | undefined }) {
  return (
    <>
      {oauth_available ? (
        <ClaimForm slug={slug} csrfToken={csrfToken} />
      ) : (
        <ClaimLink slug={slug} />
      )}
      <div>
        <Link
          href={`/apply?discogs_username=${encodeURIComponent(slug)}`}
          className="text-xs text-mc-text-dim hover:text-mc-accent transition-colors"
        >
          Or apply via waitlist
        </Link>
      </div>
    </>
  );
}

export default function InvitationFound({
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
    <motion.div initial={fadeIn} animate={fadeAnim} transition={{ duration: 0.3 }} className="w-full">
      <motion.h1 initial={fadeIn} animate={fadeAnim} transition={delay1} className="text-2xl font-bold text-mc-text mb-3">
        We found <span className="text-mc-accent">{sellerName}</span> on Discogs
      </motion.h1>
      <motion.p initial={fadeIn} animate={fadeAnim} transition={delay2} className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8">
        This URL could be your storefront. Claim it to show your Discogs inventory as a browsable,
        curated record store.
      </motion.p>
      <motion.div initial={fadeIn} animate={fadeAnim} transition={delay3} className="space-y-3">
        <ClaimCta slug={slug} oauth_available={oauth_available} csrfToken={csrfToken} />
      </motion.div>
    </motion.div>
  );
}

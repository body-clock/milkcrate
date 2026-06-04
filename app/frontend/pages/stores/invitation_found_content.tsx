import { motion } from "framer-motion";

import InvitationClaimCta from "./invitation_claim_cta";

const anim = { opacity: 0, y: 8 };
const visible = { opacity: 1, y: 0 };
const dur = { duration: 0.3 };
const d1 = { delay: 0.1, duration: 0.3 };
const d2 = { delay: 0.2, duration: 0.3 };
const d3 = { delay: 0.3, duration: 0.3 };

interface Props {
  slug: string;
  oauth_available?: boolean;
  sellerName: string | null;
  csrfToken: string | undefined;
}

function renderHeading(sellerName: string | null) {
  return (
    <motion.h1
      initial={anim}
      animate={visible}
      transition={d1}
      className="text-2xl font-bold text-mc-text mb-3"
    >
      We found <span className="text-mc-accent">{sellerName}</span> on Discogs
    </motion.h1>
  );
}

function renderMessage() {
  return (
    <motion.p
      initial={anim}
      animate={visible}
      transition={d2}
      className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
    >
      This URL could be your storefront. Claim it to show your Discogs inventory as a browsable,
      curated record store.
    </motion.p>
  );
}

function renderCta(slug: string, oauth_available?: boolean, csrfToken?: string) {
  return (
    <motion.div initial={anim} animate={visible} transition={d3} className="space-y-3">
      <InvitationClaimCta slug={slug} oauth_available={oauth_available} csrfToken={csrfToken} />
    </motion.div>
  );
}

export default function InvitationFoundContent({
  slug,
  oauth_available,
  sellerName,
  csrfToken,
}: Props) {
  return (
    <motion.div initial={anim} animate={visible} transition={dur} className="w-full">
      {renderHeading(sellerName)}
      {renderMessage()}
      {renderCta(slug, oauth_available, csrfToken)}
    </motion.div>
  );
}

import { motion } from "framer-motion";
import InvitationClaimCta from "./invitation_claim_cta";

const fadeInAnim = { opacity: 0, y: 8 };
const visibleAnim = { opacity: 1, y: 0 };
const DELAYS = [
  { duration: 0.3 },
  { delay: 0.1, duration: 0.3 },
  { delay: 0.2, duration: 0.3 },
  { delay: 0.3, duration: 0.3 },
] as const;

export default function InvitationFound({
  slug, oauth_available, sellerName, csrfToken,
}: {
  slug: string; oauth_available?: boolean; sellerName: string | null; csrfToken: string | undefined;
}) {
  return (
    <motion.div initial={fadeInAnim} animate={visibleAnim} transition={DELAYS[0]} className="w-full">
      <motion.h1 initial={fadeInAnim} animate={visibleAnim} transition={DELAYS[1]} className="text-2xl font-bold text-mc-text mb-3">
        We found <span className="text-mc-accent">{sellerName}</span> on Discogs
      </motion.h1>
      <motion.p initial={fadeInAnim} animate={visibleAnim} transition={DELAYS[2]} className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8">
        This URL could be your storefront. Claim it to show your Discogs inventory as a browsable, curated record store.
      </motion.p>
      <motion.div initial={fadeInAnim} animate={visibleAnim} transition={DELAYS[3]} className="space-y-3">
        <InvitationClaimCta slug={slug} oauth_available={oauth_available} csrfToken={csrfToken} />
      </motion.div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import { Link } from "@inertiajs/react";
import MarketingLayout from "@/layouts/marketing_layout";
import BrandMark from "@/components/brand_mark";
import { actionClassName } from "@/components/ui/action";
import { springTactile } from "@/lib/motion_tokens";
import InvitationContent from "./invitation_content";
import type { InvitationProps } from "@/types/inertia";

function ClaimedPage() {
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
          We&apos;ll notify the applicant when their storefront is ready. In the meantime, feel free to
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

export default function Invitation({ waitlist_present, slug, oauth_available }: InvitationProps) {
  if (waitlist_present) {return <ClaimedPage />;}

  return <InvitationContent slug={slug} oauth_available={oauth_available} />;
}

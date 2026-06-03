import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

import BrandMark from "@/components/brand_mark";
import { actionClassName } from "@/components/ui/action";
import MarketingLayout from "@/layouts/marketing_layout";
import { springTactile } from "@/lib/motion_tokens";
import type { InvitationProps } from "@/types/inertia";

import AnimatedBlock from "./invitation_animated_block";
import InvitationContent from "./invitation_content";

// eslint-disable-next-line react/no-multi-comp
function AnimatedBrandMark() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springTactile}
      className="mb-6"
    >
      <BrandMark size="large" />
    </motion.div>
  );
}

// eslint-disable-next-line react/no-multi-comp
function WaitlistContent() {
  return (
    <>
      <AnimatedBlock delay="step1">
        <h1 className="text-2xl font-bold text-mc-text mb-3">This URL has been claimed</h1>
      </AnimatedBlock>
      <AnimatedBlock delay="step2">
        <p className="text-sm text-mc-text-dim leading-relaxed max-w-sm">
          We&apos;ll notify the applicant when their storefront is ready. In the meantime, feel free
          to explore other storefronts on Milkcrate.
        </p>
      </AnimatedBlock>
      <AnimatedBlock delay="step3" className="mt-8">
        <Link href="/" className={actionClassName({ size: "lg", className: "tracking-wide" })}>
          Browse storefronts
        </Link>
      </AnimatedBlock>
    </>
  );
}

// eslint-disable-next-line react/no-multi-comp
function WaitlistPage() {
  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <AnimatedBrandMark />
        <WaitlistContent />
      </div>
    </MarketingLayout>
  );
}

// eslint-disable-next-line react/no-multi-comp
export default function Invitation({ waitlist_present, slug, oauth_available }: InvitationProps) {
  if (waitlist_present) {
    return <WaitlistPage />;
  }

  return <InvitationContent slug={slug} oauth_available={oauth_available} />;
}

import { Link } from "@inertiajs/react";

import { actionClassName } from "@/components/ui/action";

import AnimatedBlock from "./invitation_animated_block";

export default function WaitlistContent() {
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

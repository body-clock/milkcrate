import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";

import DiscogsSellerLookupInput from "@/components/discogs_seller_lookup_input";
import { actionClassName } from "@/components/ui/action";
import { EASE_OUT } from "@/lib/motion_tokens";

const FADE_UP_DURATION = 0.5;
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: FADE_UP_DURATION, ease: EASE_OUT } },
};

interface SellerCopy {
  seller_input_label: string;
  seller_input_placeholder: string;
  seller_submit: string;
  seller_preview_claim: string;
  seller_not_found: string;
  seller_already_active: string;
  seller_applicant_exists: string;
  seller_waitlist_fallback: string;
  seller_min_listings: string;
  seller_lookup_error: string;
}

export default function SellerLookupForm({
  copy,
  fallback,
}: {
  copy: SellerCopy;
  fallback: string;
}) {
  return (
    <>
      <motion.div variants={fadeUp}>
        <DiscogsSellerLookupInput copy={copy} />
      </motion.div>
      <motion.div variants={fadeUp} className="text-center mt-4">
        <Link href="/apply" className={actionClassName({ variant: "ghost", size: "sm" })}>
          {fallback}
        </Link>
      </motion.div>
    </>
  );
}

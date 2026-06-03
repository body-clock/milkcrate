import { motion } from "framer-motion";

import SellerLookupForm from "@/components/home/seller_lookup_form";

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

interface Props {
  title: string;
  body: string;
  copy: SellerCopy;
  fallback: string;
}

const EASE_X1 = 0.25;
const EASE_Y1 = 0.46;
const EASE_X2 = 0.45;
const EASE_Y2 = 0.94;
const EASE_OUT = [EASE_X1, EASE_Y1, EASE_X2, EASE_Y2] as const;

const FADE_UP_DURATION = 0.5;
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: FADE_UP_DURATION, ease: EASE_OUT } },
};

// eslint-disable-next-line eslint/max-lines-per-function
export default function SellerSection({ title, body, copy, fallback }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      aria-labelledby="home-seller-heading"
      className="border-t border-mc-border py-10 sm:py-16"
    >
      <div className="max-w-lg mx-auto">
        <motion.h2
          variants={fadeUp}
          id="home-seller-heading"
          className="text-lg sm:text-xl font-semibold text-mc-text text-center mb-3"
        >
          {title}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-sm text-mc-text-dim text-center leading-relaxed mb-8 max-w-md mx-auto"
        >
          {body}
        </motion.p>
        <SellerLookupForm copy={copy} fallback={fallback} />
      </div>
    </motion.section>
  );
}

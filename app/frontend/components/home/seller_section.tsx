import { motion } from "framer-motion";
import { Link } from "@inertiajs/react";
import { actionClassName } from "@/components/ui/action";
import DiscogsSellerLookupInput from "@/components/discogs_seller_lookup_input";


interface Props {
  title: string;
  body: string;
  copy: {
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
  };
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
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: FADE_UP_DURATION, ease: EASE_OUT },
  },
};

function SellerCopy({ title, body }: { title: string; body: string }) {
  return (
    <>
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
    </>
  );
}

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
        <SellerCopy title={title} body={body} />
        <motion.div variants={fadeUp}>
          <DiscogsSellerLookupInput
            copy={{
              seller_input_label: copy.seller_input_label,
              seller_input_placeholder: copy.seller_input_placeholder,
              seller_submit: copy.seller_submit,
              seller_preview_claim: copy.seller_preview_claim,
              seller_not_found: copy.seller_not_found,
              seller_already_active: copy.seller_already_active,
              seller_applicant_exists: copy.seller_applicant_exists,
              seller_waitlist_fallback: copy.seller_waitlist_fallback,
              seller_min_listings: copy.seller_min_listings,
              seller_lookup_error: copy.seller_lookup_error,
            }}
          />
        </motion.div>
        <motion.div variants={fadeUp} className="text-center mt-4">
          <Link href="/apply" className={actionClassName({ variant: "ghost", size: "sm" })}>
            {fallback}
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}

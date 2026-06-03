import { motion } from "framer-motion";

import SellerLookupForm from "@/components/home/seller_lookup_form";
import SellerHeading from "@/components/home/seller_heading";

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
        <SellerHeading title={title} body={body} />
        <SellerLookupForm copy={copy} fallback={fallback} />
      </div>
    </motion.section>
  );
}

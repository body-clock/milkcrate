import { motion } from "framer-motion";

import PreviewBody from "@/components/home/preview_body";
import PreviewHeading from "@/components/home/preview_heading";
import type { WallCrate } from "@/types/inertia";

interface Props {
  previewLabel: string;
  previewBlurb: string;
  wallCrate: WallCrate | undefined;
  storeSlug: string | null;
}

export default function PreviewSection({
  previewLabel,
  previewBlurb,
  wallCrate,
  storeSlug,
}: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      aria-labelledby="home-preview-heading"
      className="border-t border-mc-border py-10 sm:py-16"
    >
      <PreviewHeading previewLabel={previewLabel} previewBlurb={previewBlurb} />
      <PreviewBody wallCrate={wallCrate} storeSlug={storeSlug} />
    </motion.section>
  );
}

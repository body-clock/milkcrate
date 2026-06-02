import { motion } from "framer-motion";
import type { WallCrate } from "@/types/inertia";
import PreviewHeading from "./preview_heading";
import PreviewWithCrate from "./preview_with_crate";
import PreviewFallback from "./preview_fallback";

interface Props {
  previewLabel: string;
  previewBlurb: string;
  wallCrate: WallCrate | undefined;
  storeSlug: string | null;
}

export default function PreviewSection({ previewLabel, previewBlurb, wallCrate, storeSlug }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      aria-labelledby="home-preview-heading"
      className="border-t border-mc-border py-10 sm:py-16"
    >
      <PreviewHeading previewLabel={previewLabel} previewBlurb={previewBlurb} />
      {wallCrate && wallCrate.records.length > 0 ? (
        <PreviewWithCrate wallCrate={wallCrate} storeSlug={storeSlug} />
      ) : (
        <PreviewFallback />
      )}
    </motion.section>
  );
}

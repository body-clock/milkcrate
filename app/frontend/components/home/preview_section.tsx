import { motion } from "framer-motion";
import { Link } from "@inertiajs/react";
import { actionClassName } from "@/components/ui/action";
import { PileProvider } from "@/contexts/pile_context";
import CrateView from "@/components/crate_view";
import type { WallCrate } from "@/types/inertia";

interface Props {
  previewLabel: string;
  previewBlurb: string;
  wallCrate: WallCrate | undefined;
  storeSlug: string | null;
}

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};

export default function PreviewSection({ previewLabel, previewBlurb, wallCrate, storeSlug }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      aria-labelledby="home-preview-heading"
      className="border-t border-mc-border py-10 sm:py-16"
    >
      <div className="max-w-lg mx-auto text-center mb-8 sm:mb-10">
        <motion.h2
          variants={fadeUp}
          id="home-preview-heading"
          className="text-xl sm:text-2xl font-bold text-mc-text leading-snug"
        >
          {previewLabel}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-sm sm:text-base text-mc-text-dim mt-4 leading-relaxed"
        >
          {previewBlurb}
        </motion.p>
      </div>

      {wallCrate && wallCrate.records.length > 0 ? (
        <PreviewWithCrate wallCrate={wallCrate} storeSlug={storeSlug} />
      ) : (
        <PreviewFallback />
      )}
    </motion.section>
  );
}

function PreviewWithCrate({ wallCrate, storeSlug }: { wallCrate: WallCrate; storeSlug: string | null }) {
  return (
    <>
      <div className="max-w-4xl mx-auto">
        <PileProvider>
          <CrateView
            crates={[wallCrate]}
            activeSlug={wallCrate.slug}
            hideTabs
            onSelectCrate={() => {}}
          />
        </PileProvider>
      </div>
      <div className="flex justify-center mt-6">
        {storeSlug ? (
          <Link
            href={`/${storeSlug}`}
            className={actionClassName({
              variant: "ghost",
              size: "sm",
              className: "uppercase tracking-widest text-mc-accent",
            })}
          >
            See the full store →
          </Link>
        ) : (
          <Link
            href="/philadelphiamusic"
            className={actionClassName({
              variant: "ghost",
              size: "sm",
              className: "uppercase tracking-widest text-mc-accent",
            })}
          >
            See the full store →
          </Link>
        )}
      </div>
    </>
  );
}

function PreviewFallback() {
  return (
    <div className="text-center max-w-md mx-auto">
      <p className="text-sm text-mc-text-dim mb-4">
        We&apos;ll show the full Milkcrate experience in the demo store. Start with a curated
        wall crate.
      </p>
      <Link
        href="/philadelphiamusic"
        className={actionClassName({
          variant: "ghost",
          size: "sm",
          className: "uppercase tracking-widest text-mc-accent",
        })}
      >
        Philadelphia Music →
      </Link>
    </div>
  );
}

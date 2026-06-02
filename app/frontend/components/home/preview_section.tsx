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

function PreviewHeading({ previewLabel, previewBlurb }: { previewLabel: string; previewBlurb: string }) {
  return (
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
  );
}

function StoreLink({ storeSlug }: { storeSlug: string | null }) {
  const href = storeSlug ? `/${storeSlug}` : "/philadelphiamusic";
  return (
    <div className="flex justify-center mt-6">
      <Link
        href={href}
        className={actionClassName({
          variant: "ghost",
          size: "sm",
          className: "uppercase tracking-widest text-mc-accent",
        })}
      >
        See the full store →
      </Link>
    </div>
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
      <StoreLink storeSlug={storeSlug} />
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

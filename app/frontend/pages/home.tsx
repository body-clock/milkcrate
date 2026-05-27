import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"
import CrateView from "@/components/crate_view"
import DiscogsSellerLookupInput from "@/components/discogs_seller_lookup_input"
import { actionClassName } from "@/components/ui/action"
import { PileProvider } from "@/contexts/pile_context"
import type { HomepagePreview } from "@/types/inertia"

interface Props {
  copy: {
    headline: string
    subhead: string
    cta_demo: string
    hero_subhead: string
    steps: {
      step1_title: string
      step1_body: string
      step2_title: string
      step2_body: string
      step3_title: string
      step3_body: string
    }
    preview_blurb: string
    preview_label: string
    store_character_title: string
    seller_section_title: string
    seller_section_body: string
    seller_input_label: string
    seller_input_placeholder: string
    seller_submit: string
    seller_preview_claim: string
    seller_not_found: string
    seller_already_active: string
    seller_applicant_exists: string
    seller_waitlist_fallback: string
    seller_min_listings: string
    seller_lookup_error: string
    bottom_signoff: string
  }
  preview: HomepagePreview
}

const easeOut = [0.25, 0.46, 0.45, 0.94] as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: easeOut },
  },
}

export default function Home({ copy, preview }: Props) {
  const hasPreview = preview.sections.length > 0
  const picksSection = preview.sections.find((section) => section.key === "picks_wall")
  const picksCrate = picksSection?.key === "picks_wall" ? picksSection.crate : undefined
  const demoHref = hasPreview && preview.store_slug ? `/${preview.store_slug}` : "/philadelphiamusic"

  return (
    <MarketingLayout>
      {/* ── Hero — shopper-first ───────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        aria-labelledby="home-headline"
        className="flex flex-col items-center text-center pt-4 pb-10 sm:pb-16"
      >
        <motion.h1
          variants={fadeUp}
          id="home-headline"
          className="text-2xl sm:text-3xl font-bold text-mc-text mb-3 leading-tight max-w-md"
        >
          {copy.headline}
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-sm sm:text-base text-mc-text-dim mb-8 leading-relaxed max-w-md"
        >
          {copy.subhead}
        </motion.p>

        <motion.div variants={fadeUp}>
          <Link
            href={demoHref}
            className={actionClassName({ size: "lg", className: "w-full text-center tracking-wide sm:w-auto" })}
          >
            {copy.cta_demo}
          </Link>
        </motion.div>
      </motion.section>

      {/* ── Storefront Preview — curation proof ─────── */}
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
            {copy.preview_label}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm sm:text-base text-mc-text-dim mt-4 leading-relaxed"
          >
            {copy.preview_blurb}
          </motion.p>
        </div>

        {picksCrate && picksCrate.records.length > 0 ? (
          <>
            <div className="max-w-4xl mx-auto">
              <PileProvider>
                <CrateView
                  crates={[picksCrate]}
                  activeSlug={picksCrate.slug}
                  hideTabs
                  onSelectCrate={() => {}}
                />
              </PileProvider>
            </div>
            <div className="flex justify-center mt-6">
              {preview.store_slug ? (
                <Link
                  href={`/${preview.store_slug}`}
                  className={actionClassName({ variant: "ghost", size: "sm", className: "uppercase tracking-widest text-mc-accent" })}
                >
                  See the full store →
                </Link>
              ) : (
                <Link
                  href="/philadelphiamusic"
                  className={actionClassName({ variant: "ghost", size: "sm", className: "uppercase tracking-widest text-mc-accent" })}
                >
                  See the full store →
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="text-center max-w-md mx-auto">
            <p className="text-sm text-mc-text-dim mb-4">
              We&apos;ll show the full Milkcrate experience in the demo store. Start with a
              curated picks crate.
            </p>
            <Link
              href="/philadelphiamusic"
              className={actionClassName({ variant: "ghost", size: "sm", className: "uppercase tracking-widest text-mc-accent" })}
            >
              Philadelphia Music →
            </Link>
          </div>
        )}
      </motion.section>

      {/* ── Store Character — product-real concepts ── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-character-heading"
        className="border-t border-mc-border py-10 sm:py-16"
      >
        <motion.h2
          variants={fadeUp}
          id="home-character-heading"
          className="text-xl sm:text-2xl font-bold text-mc-text text-center mb-10"
        >
          {copy.store_character_title}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-base font-semibold text-mc-text">Milkcrate Picks</h3>
            <p className="text-sm text-mc-text-dim leading-relaxed">
              Interesting finds from the whole collection.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-base font-semibold text-mc-text">Featured Crates</h3>
            <p className="text-sm text-mc-text-dim leading-relaxed">
              Spotlight new arrivals, randomized sub-genres, and hidden gems.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-base font-semibold text-mc-text">Genre Bins</h3>
            <p className="text-sm text-mc-text-dim leading-relaxed">
              Records organized by genre, just like a real shop.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-base font-semibold text-mc-text">Start a Pile</h3>
            <p className="text-sm text-mc-text-dim leading-relaxed">
              Collect records as you browse, then carry them over to Discogs.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Seller OAuth — self-serve Discogs onboarding ── */}
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
            {copy.seller_section_title}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm text-mc-text-dim text-center leading-relaxed mb-8 max-w-md mx-auto"
          >
            {copy.seller_section_body}
          </motion.p>
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
          <motion.div
            variants={fadeUp}
            className="text-center mt-4"
          >
            <Link
              href="/apply"
              className={actionClassName({ variant: "ghost", size: "sm" })}
            >
              {copy.seller_waitlist_fallback}
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ── How It Works — OAuth-first steps ───────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-steps-heading"
        className="border-t border-mc-border py-10 sm:py-16"
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-mc-accent text-mc-on-accent flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-sm font-semibold text-mc-text">
                {copy.steps.step1_title}
              </h3>
              <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
                {copy.steps.step1_body}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-mc-accent text-mc-on-accent flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-sm font-semibold text-mc-text">
                {copy.steps.step2_title}
              </h3>
              <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
                {copy.steps.step2_body}
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-mc-accent text-mc-on-accent flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-sm font-semibold text-mc-text">
                {copy.steps.step3_title}
              </h3>
              <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
                {copy.steps.step3_body}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Lean Bottom ─────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="border-t border-mc-border py-8 sm:py-10"
      >
        <div className="max-w-md mx-auto text-center">
          <motion.p
            variants={fadeUp}
            className="text-sm text-mc-text-dim leading-relaxed"
          >
            {copy.bottom_signoff}
          </motion.p>
        </div>
      </motion.section>
    </MarketingLayout>
  )
}

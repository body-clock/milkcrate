import React from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"
import CrateView from "@/components/crate_view"
import { PileProvider } from "@/contexts/pile_context"
import type { HomepagePreview } from "@/types/inertia"

interface Props {
  copy: {
    headline: string
    subhead: string
    cta_demo: string
    cta_apply: string
    footnote: string
    steps: {
      step1_title: string
      step1_body: string
      step2_title: string
      step2_body: string
      step3_title: string
      step3_body: string
    }
    preview_label: string
    record_fair_title: string
    record_fair_body: string
    store_character_title: string
  }
  preview: HomepagePreview
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

const ctaBase =
  "w-full sm:flex-1 sm:min-w-0 min-h-11 px-6 sm:px-4 py-3 rounded-lg font-semibold text-sm sm:text-xs leading-5 tracking-wide text-center whitespace-nowrap inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"

export default function Home({ copy, preview }: Props) {
  const hasPreview = preview.sections.length > 0
  const picksSection = preview.sections.find((section) => section.key === "picks_wall")
  const picksCrate = picksSection?.key === "picks_wall" ? picksSection.crate : null
  const hasPicksPreview = Boolean(picksCrate && picksCrate.records.length > 0)

  return (
    <MarketingLayout>
      {/* ── Hero — vendor-first ────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        aria-labelledby="home-headline"
        className="flex flex-col items-center text-center pt-12 sm:pt-20 pb-10 sm:pb-16"
      >
        <motion.h1
          variants={fadeUp}
          id="home-headline"
          className="text-2xl sm:text-3xl font-bold mc-text mb-3 leading-tight max-w-md"
        >
          {copy.headline}
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-sm sm:text-base text-mc-text-dim mb-10 leading-relaxed max-w-md"
        >
          {copy.subhead}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md"
        >
          {hasPreview && preview.store_slug ? (
            <Link
              href={`/${preview.store_slug}`}
              className={`${ctaBase} bg-mc-accent text-mc-on-accent hover:opacity-90`}
            >
              {copy.cta_demo}
            </Link>
          ) : (
            <Link
              href="/philadelphiamusic"
              className={`${ctaBase} bg-mc-accent text-mc-on-accent hover:opacity-90`}
            >
              {copy.cta_demo}
            </Link>
          )}
          <Link
            href="/apply"
            className={`${ctaBase} border border-mc-border mc-text hover:border-mc-accent hover:text-mc-accent`}
          >
            {copy.cta_apply}
          </Link>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-5 text-xs text-mc-text-dim"
        >
          {copy.footnote}
        </motion.p>
      </motion.section>

      {/* ── Storefront Preview — curation proof ─────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-preview-heading"
        className="border-t border-mc-border py-10 sm:py-16"
      >
        <div className="max-w-md mx-auto text-center mb-6 sm:mb-8">
          <span className="mc-section-name text-sm" id="home-preview-heading">
            {copy.preview_label}
          </span>
        </div>

        {hasPicksPreview ? (
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
                  className="text-xs font-semibold uppercase tracking-widest text-mc-accent hover:opacity-80 transition-opacity"
                >
                  See the full store →
                </Link>
              ) : (
                <Link
                  href="/philadelphiamusic"
                  className="text-xs font-semibold uppercase tracking-widest text-mc-accent hover:opacity-80 transition-opacity"
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
              className="text-sm font-semibold uppercase tracking-widest text-mc-accent hover:opacity-80 transition-opacity"
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
          className="text-lg sm:text-xl font-semibold mc-text text-center mb-10"
        >
          {copy.store_character_title}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-sm font-semibold mc-text">Milkcrate Picks</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed">
              Our digger algorithm surfaces the most interesting records in your inventory —
              refreshed daily.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-sm font-semibold mc-text">Featured Crates</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed">
              We shape a front-of-store view that highlights strong entry points for browsing.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-sm font-semibold mc-text">Genre Bins</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed">
              Records organized by genre, just like a real shop — jazz, soul, electronic,
              hip-hop, and more.
            </p>
          </motion.div>

          <motion.div
            variants={fadeIn}
            className="flex flex-col items-center text-center gap-3 p-4 rounded-xl bg-mc-bg-raised border border-mc-border"
          >
            <h3 className="text-sm font-semibold mc-text">Build Your Pile</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed">
              Customers can collect records in a pile while they browse and compare finds.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Onboarding Steps — how it works ────────── */}
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
              <h3 className="text-sm font-semibold mc-text">
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
              <h3 className="text-sm font-semibold mc-text">
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
              <h3 className="text-sm font-semibold mc-text">
                {copy.steps.step3_title}
              </h3>
              <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
                {copy.steps.step3_body}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Record-Fair Callout ────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-fair-heading"
        className="border-t border-mc-border py-10 sm:py-14"
      >
        <div className="max-w-lg mx-auto text-center">
          <motion.h2
            variants={fadeUp}
            id="home-fair-heading"
            className="text-base sm:text-lg font-semibold mc-text mb-3"
          >
            {copy.record_fair_title}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm text-mc-text-dim leading-relaxed mb-4"
          >
            {copy.record_fair_body}
          </motion.p>
        </div>
      </motion.section>

      {/* ── Final CTA ──────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="border-t border-mc-border py-10 sm:py-16"
      >
        <div className="max-w-md mx-auto text-center">
          <motion.p
            variants={fadeUp}
            className="text-sm text-mc-text-dim mb-6 leading-relaxed"
          >
            We&rsquo;re onboarding stores one at a time. Tell us about yours and we&rsquo;ll be in
            touch.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              href="/apply"
              className="inline-block px-8 py-3 rounded-lg bg-mc-accent text-mc-on-accent font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              {copy.cta_apply}
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </MarketingLayout>
  )
}

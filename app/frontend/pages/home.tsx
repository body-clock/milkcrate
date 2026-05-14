import React from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"
import type { HomepagePreview } from "@/types/inertia"

interface Props {
  copy: {
    headline: string
    subhead: string
    cta_demo: string
    cta_apply: string
    footnote: string
  }
  /** Bounded homepage preview data from the server. Consumed by the proof module (U6). */
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

const ctaBase =
  "w-full px-6 py-3 rounded-lg font-semibold text-sm tracking-wide text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"

// Decorative crate thumbnails — warm textures hinting at the browsing feel
function CrateThumbnail({ rotate, label }: { rotate: string; label: string }) {
  return (
    <motion.div
      className="relative rounded-lg overflow-hidden border border-mc-border/50 cursor-pointer select-none bg-mc-bg-card"
      style={{ aspectRatio: "1", rotate }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <div className="absolute inset-1 grid grid-cols-2 gap-1.5 p-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-sm opacity-20"
            style={{
              backgroundColor: i % 2 === 0 ? "var(--mc-text)" : "var(--mc-accent)",
              rotate: i === 0 ? "-2deg" : i === 3 ? "2deg" : "0deg",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-white/90 drop-shadow-sm">{label}</span>
      </div>
    </motion.div>
  )
}

export default function Home({ copy }: Props) {
  return (
    <MarketingLayout>
      {/* ── Hero ────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        aria-labelledby="home-headline"
        className="flex flex-col items-center text-center pt-12 sm:pt-20 pb-10 sm:pb-16"
      >
        <motion.span
          variants={fadeUp}
          className="text-5xl sm:text-6xl mb-5"
          aria-hidden="true"
        >
          🥛
        </motion.span>

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
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
        >
          <Link
            href="/philadelphiamusic"
            className={`${ctaBase} bg-mc-accent text-mc-on-accent hover:opacity-90`}
          >
            {copy.cta_demo}
          </Link>
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

      {/* ── How Browsing Works ──────────────────────── */}
      <section className="border-t border-mc-border py-10 sm:py-16">
        <div className="max-w-md mx-auto text-center mb-8 sm:mb-10">
          <span className="mc-section-name text-sm">Browse like you&apos;re in the shop</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-3xl mx-auto">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mc-bg-raised border border-mc-border flex items-center justify-center text-lg">📀</div>
            <h3 className="text-sm font-semibold mc-text">Flip through crates</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
              Each crate is a curated stack of records. Tap to flip through, drag to browse fast.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mc-bg-raised border border-mc-border flex items-center justify-center text-lg">👀</div>
            <h3 className="text-sm font-semibold mc-text">Discover what&apos;s interesting</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
              Not a search results page. Our digger algorithm surfaces the records worth your time.
            </p>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-mc-bg-raised border border-mc-border flex items-center justify-center text-lg">📦</div>
            <h3 className="text-sm font-semibold mc-text">Build your pile</h3>
            <p className="text-xs text-mc-text-dim leading-relaxed max-w-[220px]">
              Drop records into your pile as you dig. When you&apos;re done, add them all to your Discogs cart.
            </p>
          </div>
        </div>
      </section>

      {/* ── Visual Preview ──────────────────────────── */}
      <section className="pb-12 sm:pb-20">
        <div className="max-w-md mx-auto text-center mb-6">
          <span className="mc-section-name text-sm">What flipping through a crate looks like</span>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Desktop: decorative crate grid */}
          <div className="hidden sm:grid sm:grid-cols-4 gap-3">
            <CrateThumbnail rotate="-1deg" label="Jazz" />
            <CrateThumbnail rotate="1.5deg" label="Soul" />
            <CrateThumbnail rotate="-0.5deg" label="Electronic" />
            <CrateThumbnail rotate="1deg" label="Folk" />
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="flex sm:hidden gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            <div className="w-[60vw] flex-shrink-0">
              <CrateThumbnail rotate="-1deg" label="Jazz" />
            </div>
            <div className="w-[60vw] flex-shrink-0">
              <CrateThumbnail rotate="1.5deg" label="Soul" />
            </div>
            <div className="w-[60vw] flex-shrink-0">
              <CrateThumbnail rotate="-0.5deg" label="Electronic" />
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <Link
            href="/philadelphiamusic"
            className="text-xs font-semibold uppercase tracking-widest text-mc-accent hover:opacity-80 transition-opacity"
          >
            See a live store →
          </Link>
        </div>
      </section>
    </MarketingLayout>
  )
}

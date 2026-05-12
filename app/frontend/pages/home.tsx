import React from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"

interface Props {
  copy: {
    headline: string
    subhead: string
    cta_demo: string
    cta_apply: string
    footnote: string
  }
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

export default function Home({ copy }: Props) {
  return (
    <MarketingLayout>
      <motion.section
        initial="hidden"
        animate="visible"
        aria-labelledby="home-headline"
        className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24 max-w-sm mx-auto"
      >
        <motion.span
          variants={fadeUp}
          className="text-6xl mb-6"
          aria-hidden="true"
        >
          🥛
        </motion.span>

        <motion.h1
          variants={fadeUp}
          id="home-headline"
          className="text-2xl font-bold mc-text mb-3 leading-tight"
        >
          {copy.headline}
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-sm text-mc-text-dim mb-10 leading-relaxed"
        >
          {copy.subhead}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center gap-3 w-full max-w-xs"
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
          className="mt-6 text-xs text-mc-text-dim"
        >
          {copy.footnote}
        </motion.p>
      </motion.section>
    </MarketingLayout>
  )
}

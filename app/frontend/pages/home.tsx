import React from "react"
import { motion } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"
import Text from "@/components/text"
import Button from "@/components/button"

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
          className="mb-3 leading-tight"
        >
          <Text variant="display" as="span" className="!text-2xl !tracking-normal !normal-case">
            {copy.headline}
          </Text>
        </motion.h1>

        <motion.div variants={fadeUp} className="mb-10 leading-relaxed">
          <Text variant="body">{copy.subhead}</Text>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center gap-3 w-full max-w-xs"
        >
          <Button variant="primary" href="/philadelphiamusic" className="w-full">
            {copy.cta_demo}
          </Button>
          <Button variant="ghost" href="/apply" className="w-full border-mc-border hover:border-mc-accent">
            {copy.cta_apply}
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6">
          <Text variant="dim">{copy.footnote}</Text>
        </motion.div>
      </motion.section>
    </MarketingLayout>
  )
}

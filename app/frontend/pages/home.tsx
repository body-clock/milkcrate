import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import type { Variants } from "framer-motion"
import HomeStorefrontLobby from "@/components/home_storefront_lobby"
import MarketingLayout from "@/layouts/marketing_layout"
import type { HomeHeroCopy } from "@/components/home_storefront_lobby"
import type { HomepagePreview } from "@/types/inertia"

interface LoopItemCopy {
  title: string
  body: string
}

interface StoreMomentCopy {
  title: string
  body: string
}

interface Props {
  copy: {
    hero: HomeHeroCopy
    marketplace_loop: {
      title: string
      items: LoopItemCopy[]
    }
    seller_path: {
      title: string
      body: string
      cta: string
    }
    store_character: {
      title: string
      moments: StoreMomentCopy[]
    }
    record_fair: {
      title: string
      body: string
    }
    final_cta: {
      body: string
      cta: string
    }
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

export default function Home({ copy, preview }: Props) {
  return (
    <MarketingLayout>
      <HomeStorefrontLobby copy={copy.hero} preview={preview} />

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-loop-heading"
        className="border-t border-mc-border py-10 sm:py-14"
      >
        <div className="max-w-3xl">
          <p className="mc-section-name mb-3 text-sm">Marketplace loop</p>
          <motion.h2
            variants={fadeUp}
            id="home-loop-heading"
            className="text-xl font-semibold leading-tight mc-text sm:text-2xl"
          >
            {copy.marketplace_loop.title}
          </motion.h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {copy.marketplace_loop.items.map((item) => (
            <motion.article
              key={item.title}
              variants={fadeUp}
              className="border-t border-mc-border pt-4"
            >
              <h3 className="text-sm font-semibold mc-text">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mc-text-dim">
                {item.body}
              </p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-seller-heading"
        className="border-t border-mc-border py-10 sm:py-14"
      >
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="max-w-2xl">
            <p className="mc-section-name mb-3 text-sm">For sellers</p>
            <motion.h2
              variants={fadeUp}
              id="home-seller-heading"
              className="text-xl font-semibold leading-tight mc-text sm:text-2xl"
            >
              {copy.seller_path.title}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-3 text-sm leading-relaxed text-mc-text-dim"
            >
              {copy.seller_path.body}
            </motion.p>
          </div>
          <motion.div variants={fadeUp}>
            <Link
              href="/apply"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-mc-accent px-6 py-3 text-sm font-semibold tracking-wide text-mc-on-accent transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              {copy.seller_path.cta}
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-character-heading"
        className="border-t border-mc-border py-10 sm:py-14"
      >
        <div className="max-w-3xl">
          <p className="mc-section-name mb-3 text-sm">Store character</p>
          <motion.h2
            variants={fadeUp}
            id="home-character-heading"
            className="text-xl font-semibold leading-tight mc-text sm:text-2xl"
          >
            {copy.store_character.title}
          </motion.h2>
        </div>

        <div className="mt-8 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-5">
          {copy.store_character.moments.map((moment) => (
            <motion.article
              key={moment.title}
              variants={fadeUp}
              className="border-t border-mc-border pt-4"
            >
              <h3 className="text-sm font-semibold mc-text">
                {moment.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mc-text-dim">
                {moment.body}
              </p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        aria-labelledby="home-fair-heading"
        className="border-t border-mc-border py-10 sm:py-14"
      >
        <div className="max-w-2xl">
          <p className="mc-section-name mb-3 text-sm">Record fairs</p>
          <motion.h2
            variants={fadeUp}
            id="home-fair-heading"
            className="text-xl font-semibold leading-tight mc-text sm:text-2xl"
          >
            {copy.record_fair.title}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-3 text-sm leading-relaxed text-mc-text-dim"
          >
            {copy.record_fair.body}
          </motion.p>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="border-t border-mc-border py-10 sm:py-16"
      >
        <div className="max-w-2xl">
          <motion.p
            variants={fadeUp}
            className="text-sm leading-relaxed text-mc-text-dim"
          >
            {copy.final_cta.body}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6">
            <Link
              href="/apply"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-mc-accent px-6 py-3 text-sm font-semibold tracking-wide text-mc-on-accent transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              {copy.final_cta.cta}
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </MarketingLayout>
  )
}

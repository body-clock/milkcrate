import React from "react"
import { Link } from "@inertiajs/react"
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

export default function Home({ copy }: Props) {
  return (
    <MarketingLayout>
      <div className="flex flex-col items-center justify-center text-center px-6 py-20 max-w-sm mx-auto">
        <p className="text-6xl mb-6">🥛</p>
        <h1 className="text-2xl font-bold mc-text mb-3 leading-snug">
          {copy.headline}
        </h1>
        <p className="text-sm text-mc-text-dim mb-10 leading-relaxed">
          {copy.subhead}
        </p>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Link
            href="/philadelphiamusic"
            className="w-full px-6 py-3 rounded-lg bg-mc-accent text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity text-center"
          >
            {copy.cta_demo}
          </Link>
          <Link
            href="/apply"
            className="w-full px-6 py-3 rounded-lg border border-mc-border text-sm mc-text hover:opacity-80 transition-opacity text-center"
          >
            {copy.cta_apply}
          </Link>
        </div>

        <p className="mt-6 text-xs text-mc-text-dim">{copy.footnote}</p>
      </div>
    </MarketingLayout>
  )
}

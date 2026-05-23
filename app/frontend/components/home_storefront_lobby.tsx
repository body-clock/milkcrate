import { Link } from "@inertiajs/react"
import CrateShelf from "@/components/crate_shelf"
import type { Crate, HomepagePreview, StorefrontSection } from "@/types/inertia"

export interface HomeHeroCopy {
  headline: string
  subhead: string
  cta_demo: string
  cta_apply: string
  footnote: string
  preview_label: string
  fallback_title: string
  fallback_body: string
}

interface Props {
  copy: HomeHeroCopy
  preview: HomepagePreview
}

function demoHref(preview: HomepagePreview) {
  return preview.store_slug ? `/${preview.store_slug}` : "/philadelphiamusic"
}

function picksCrateFrom(sections: StorefrontSection[]): Crate | undefined {
  const picksSection = sections.find((section) => section.key === "picks_wall")
  return picksSection?.key === "picks_wall" ? picksSection.crate : undefined
}

function recordCountLabel(count: number) {
  return count === 1 ? "1 record" : `${count} records`
}

export default function HomeStorefrontLobby({ copy, preview }: Props) {
  const href = demoHref(preview)
  const picksCrate = picksCrateFrom(preview.sections)
  const hasPicks = Boolean(picksCrate && picksCrate.records.length > 0)

  return (
    <section
      aria-labelledby="home-headline"
      className="pb-10 pt-3 sm:pb-14 sm:pt-6"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] lg:gap-12">
        <div className="max-w-xl">
          <p className="mc-section-name mb-3 text-sm">Milkcrate</p>
          <h1
            id="home-headline"
            className="max-w-lg text-3xl font-bold leading-tight mc-text sm:text-4xl"
          >
            {copy.headline}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-mc-text-dim">
            {copy.subhead}
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">
            <Link
              href={href}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-mc-accent px-6 py-3 text-center text-sm font-semibold tracking-wide text-mc-on-accent transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              {copy.cta_demo}
            </Link>
            <Link
              href="/apply"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-mc-border px-6 py-3 text-center text-sm font-semibold tracking-wide mc-text transition-colors hover:border-mc-accent hover:text-mc-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
            >
              {copy.cta_apply}
            </Link>
          </div>

          <p className="mt-4 max-w-md text-xs leading-relaxed text-mc-text-dim">
            {copy.footnote}
          </p>
        </div>

        <aside
          aria-labelledby="home-lobby-preview-heading"
          className="rounded-lg border border-mc-border bg-mc-bg-raised p-3 sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-4 border-b border-mc-border pb-2">
            <div>
              <p
                id="home-lobby-preview-heading"
                className="mc-section-name text-sm"
              >
                {copy.preview_label}
              </p>
              <p className="mt-1 text-xs text-mc-text-dim">
                {preview.store_name}
              </p>
            </div>
            <span className="text-xs uppercase tracking-widest text-mc-text-dim">
              Discogs
            </span>
          </div>

          {hasPicks && picksCrate ? (
            <CrateShelf
              crate={picksCrate}
              headerSize="featured"
              previewCount={4}
              meta={recordCountLabel(picksCrate.records.length)}
            />
          ) : (
            <div className="rounded-lg border border-mc-border bg-mc-bg-card p-4">
              <p className="text-sm font-semibold mc-text">
                {copy.fallback_title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-mc-text-dim">
                {copy.fallback_body}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
                <span className="h-16 rounded-sm border border-mc-border/70 bg-mc-bg-raised" />
                <span className="h-16 rounded-sm border border-mc-border/70 bg-mc-bg-raised" />
                <span className="h-16 rounded-sm border border-mc-border/70 bg-mc-bg-raised" />
              </div>
            </div>
          )}

          <Link
            href={href}
            className="mt-4 inline-flex rounded text-xs font-semibold uppercase tracking-widest text-mc-accent transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg"
          >
            Open the demo storefront
          </Link>
        </aside>
      </div>
    </section>
  )
}

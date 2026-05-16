import { useState, useEffect, useMemo } from "react"
import { Link } from "@inertiajs/react"
import { motion } from "framer-motion"
import MarketingLayout from "@/layouts/marketing_layout"
import BrandMark from "@/components/brand_mark"
import { springTactile } from "@/lib/motion_tokens"
import type { InvitationProps } from "@/types/inertia"

export default function Invitation({ waitlist_present, slug, discogs_username }: InvitationProps) {
  // Waitlist acknowledgment — no probe, static page
  if (waitlist_present) {
    return (
      <MarketingLayout>
        <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springTactile}
            className="mb-6"
          >
            <BrandMark size="large" showWordmark={false} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="text-2xl font-bold mc-text mb-3"
          >
            This URL has been claimed
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-sm text-mc-text-dim leading-relaxed max-w-sm"
          >
            We'll notify the applicant when their storefront is ready. In the
            meantime, feel free to explore other storefronts on Milkcrate.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="mt-8"
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-mc-accent text-mc-on-accent font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
            >
              Browse storefronts
            </Link>
          </motion.div>
        </div>
      </MarketingLayout>
    )
  }

  // Invitation page — async Discogs probe
  return <InvitationContent slug={slug} discogsUsername={discogs_username} />
}

function InvitationContent({ slug, discogsUsername }: { slug: string; discogsUsername: string }) {
  const [probeState, setProbeState] = useState<"loading" | "found" | "not_found" | "error">("loading")
  const [sellerName, setSellerName] = useState<string | null>(null)

  // Quality gate: only probe plausible Discogs usernames
  const shouldProbe = useMemo(() => {
    if (slug.length < 3 || slug.length > 40) return false
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(slug)) return false

    const reserved = [
      "admin", "apply", "jobs", "up", "assets",
      "login", "logout", "signup", "register",
      "api", "docs", "status", "help", "support",
    ]
    if (reserved.includes(slug.toLowerCase())) return false

    return true
  }, [slug])

  useEffect(() => {
    if (!shouldProbe) {
      setProbeState("not_found")
      return
    }

    const controller = new AbortController()

    fetch(`/api/discogs/lookup/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.found) {
          setSellerName(data.seller_name || slug)
          setProbeState("found")
        } else {
          setProbeState("not_found")
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setProbeState("error")
      })

    return () => controller.abort()
  }, [slug, shouldProbe])

  return (
    <MarketingLayout>
      <div className="flex flex-col items-center text-center pb-16 max-w-lg mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springTactile}
          className="mb-6"
        >
          <BrandMark size="large" showWordmark={false} />
        </motion.div>

        {/* Loading state */}
        {probeState === "loading" && (
          <>
            <div className="w-8 h-8 mb-4 border-2 border-mc-accent border-t-transparent rounded-full motion-safe:animate-spin" />
            <p className="text-sm text-mc-text-dim">Checking if this URL is available...</p>
          </>
        )}

        {/* Seller found — personalized invitation */}
        {probeState === "found" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-2xl font-bold mc-text mb-3"
            >
              We found <span className="text-mc-accent">{sellerName}</span> on Discogs
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
            >
              This URL could be your storefront. Claim it to show your Discogs
              inventory as a browsable, curated record store.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Link
                href={`/apply?discogs_username=${encodeURIComponent(discogsUsername)}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-mc-accent text-mc-on-accent font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              >
                Claim this storefront
              </Link>
            </motion.div>
          </motion.div>
        )}

        {/* Not found or errored — generic invitation */}
        {(probeState === "not_found" || probeState === "error") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-2xl font-bold mc-text mb-3"
            >
              This page is available
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-sm text-mc-text-dim leading-relaxed max-w-sm mx-auto mb-8"
            >
              If you sell records on Discogs, you can turn this URL into your
              own browsable storefront on Milkcrate.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Link
                href="/apply"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-mc-accent text-mc-on-accent font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity"
              >
                Apply to join
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>
    </MarketingLayout>
  )
}

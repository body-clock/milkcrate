import React from "react"
import { cn } from "@/components/ui/class_names"

const scoreVariants: Record<string, string> = {
  high: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  low: "border-red-500/40 bg-red-500/10 text-red-200",
  none: "border-mc-border bg-mc-bg-raised text-mc-text-dim",
}

function scoreTier(score: number | null): "high" | "medium" | "low" | "none" {
  if (score === null || score === undefined) return "none"
  if (score >= 60) return "high"
  if (score >= 30) return "medium"
  return "low"
}

export default function LeadScoreBadge({
  score,
  className,
}: {
  score: number | null
  className?: string
}) {
  const tier = scoreTier(score)

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-none",
        scoreVariants[tier],
        className
      )}
    >
      {score !== null ? `${Math.round(score)}` : "—"}
    </span>
  )
}

export { scoreTier }

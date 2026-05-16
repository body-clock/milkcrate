import React from "react"
import { cn } from "@/components/ui/class_names"

const variants: Record<string, string> = {
  no_presence: "border-mc-border bg-mc-bg-raised text-mc-text-dim",
  social_media: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  standalone_ecommerce: "border-red-500/40 bg-red-500/10 text-red-200",
  other: "border-amber-500/40 bg-amber-500/10 text-amber-200",
}

const labels: Record<string, string> = {
  no_presence: "No shop found",
  social_media: "Social only",
  standalone_ecommerce: "Ecommerce found",
  other: "Has web presence",
}

export default function LeadWebPresenceBadge({
  classifiedAs,
  className,
}: {
  classifiedAs?: string | null
  className?: string
}) {
  const key = classifiedAs || "no_presence"

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-none",
        variants[key] || variants.no_presence,
        className
      )}
    >
      {labels[key] || labels.no_presence}
    </span>
  )
}

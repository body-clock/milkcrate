import React from "react"
import { cn } from "./class_names"

type BadgeVariant = "good" | "working" | "warning" | "danger" | "neutral"

const variants: Record<BadgeVariant, string> = {
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  working: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/40 bg-red-500/10 text-red-200",
  neutral: "border-mc-border bg-mc-bg-raised text-mc-text-dim",
}

export default function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-none",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

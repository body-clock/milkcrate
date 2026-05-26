import React from "react"
import { cn } from "./class_names"

type BadgeVariant = "good" | "working" | "warning" | "danger" | "neutral"

const variants: Record<BadgeVariant, string> = {
  good: "border-mc-feedback-success-border bg-mc-feedback-success-bg text-mc-feedback-success",
  working: "border-mc-feedback-progress-border bg-mc-feedback-progress-bg text-mc-feedback-progress",
  warning: "border-mc-feedback-warning-border bg-mc-feedback-warning-bg text-mc-feedback-warning",
  danger: "border-mc-feedback-danger-border bg-mc-feedback-danger-bg text-mc-feedback-danger",
  neutral: "border-mc-feedback-neutral-border bg-mc-feedback-neutral-bg text-mc-feedback-neutral",
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

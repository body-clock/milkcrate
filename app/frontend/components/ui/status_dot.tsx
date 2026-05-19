import { cn } from "./class_names"

type StatusVariant = "good" | "working" | "warning" | "danger" | "neutral"

const variants: Record<StatusVariant, string> = {
  good: "bg-emerald-400",
  working: "bg-sky-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
  neutral: "bg-mc-text-dim",
}

export default function StatusDot({
  variant = "neutral",
  label,
  className,
}: {
  variant?: StatusVariant
  label: string
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-mc-text-dim", className)}>
      <span className={cn("h-2.5 w-2.5 rounded-full", variants[variant])} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

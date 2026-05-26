import React from "react"
import { cn } from "./class_names"

export default function EmptyState({
  action,
  className,
  children,
}: {
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-mc-border px-4 py-8 text-center text-sm text-mc-text-dim", className)}>
      <p>{children}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

import React from "react"
import { cn } from "./class_names"

interface SectionHeaderProps {
  id?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export default function SectionHeader({ id, title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-bold text-mc-text">{title}</h2>
        {description && <p className="mt-1 text-sm text-mc-text-dim">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

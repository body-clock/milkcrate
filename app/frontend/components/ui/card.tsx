import React from "react"
import { cn } from "./class_names"

export default function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-mc-border bg-mc-bg-card", className)}
      {...props}
    />
  )
}

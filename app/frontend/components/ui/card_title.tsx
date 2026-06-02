import React from "react"
import { cn } from "./class_names"

export default function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-mc-text", className)} {...props} />
}

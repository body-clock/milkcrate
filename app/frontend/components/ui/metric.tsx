import React from "react";

import { cn } from "./class_names";

export default function Metric({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
      <dd className="mt-1 break-words font-medium text-mc-text">{value}</dd>
    </div>
  );
}

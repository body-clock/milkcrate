import React from "react";

import { cn } from "./class_names";

export default function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pb-2", className)} {...props} />;
}

import React from "react";

import { cn } from "./class_names";

export type FeedbackTone = "neutral" | "success" | "warning" | "danger" | "progress";

const tones: Record<FeedbackTone, string> = {
  neutral: "border-mc-feedback-neutral-border bg-mc-feedback-neutral-bg text-mc-feedback-neutral",
  success: "border-mc-feedback-success-border bg-mc-feedback-success-bg text-mc-feedback-success",
  warning: "border-mc-feedback-warning-border bg-mc-feedback-warning-bg text-mc-feedback-warning",
  danger: "border-mc-feedback-danger-border bg-mc-feedback-danger-bg text-mc-feedback-danger",
  progress:
    "border-mc-feedback-progress-border bg-mc-feedback-progress-bg text-mc-feedback-progress",
};

function pickRole(
  live: "polite" | "assertive" | undefined,
  role: string | undefined,
): string | undefined {
  if (role) {
    return role;
  }
  if (live === "assertive") {
    return "alert";
  }
  if (live) {
    return "status";
  }
  return undefined;
}

export default function FeedbackMessage({
  tone = "neutral",
  live,
  role,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: FeedbackTone; live?: "polite" | "assertive" }) {
  return (
    <div
      {...props}
      className={cn("rounded-md border px-3 py-2 text-sm", tones[tone], className)}
      role={pickRole(live, role)}
      aria-live={live}
    >
      {children}
    </div>
  );
}

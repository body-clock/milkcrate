import { cn } from "./class_names";

export { ActionLink } from "./action_link";

export type ActionVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ActionSize = "sm" | "md" | "lg";

const variants: Record<ActionVariant, string> = {
  primary: "bg-mc-accent text-mc-on-accent hover:opacity-90",
  secondary: "border border-mc-border bg-mc-bg-card text-mc-text hover:bg-mc-bg-raised",
  ghost: "text-mc-text-dim hover:bg-mc-bg-raised hover:text-mc-text",
  danger:
    "border border-mc-feedback-danger-border bg-mc-feedback-danger-bg text-mc-feedback-danger hover:opacity-90",
  success:
    "border border-mc-feedback-success-border bg-mc-feedback-success-bg text-mc-feedback-success hover:opacity-90",
};

const sizes: Record<ActionSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-6 py-2.5 text-sm",
};

export function actionClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ActionVariant;
  size?: ActionSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mc-focus focus-visible:ring-offset-2 focus-visible:ring-offset-mc-bg",
    sizes[size],
    variants[variant],
    className,
  );
}

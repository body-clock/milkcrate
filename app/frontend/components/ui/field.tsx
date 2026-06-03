import React, { useId } from "react";

import { cn } from "./class_names";
import FieldError from "./field_error";
import FieldLabel from "./field_label";

type FieldControlProps = {
  "aria-busy"?: boolean | "true" | "false";
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  className?: string;
  disabled?: boolean;
  id?: string;
};

export const fieldControlClassName =
  "min-h-10 w-full rounded-md border border-mc-border bg-mc-bg px-3 py-2 text-sm text-mc-text outline-none transition-colors placeholder:text-mc-text-dim focus:border-mc-focus focus:ring-2 focus:ring-mc-focus/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-mc-feedback-danger-border aria-invalid:focus:ring-mc-feedback-danger/40";

interface FieldProps {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactElement<FieldControlProps>;
}

interface FieldControlOptions {
  children: React.ReactElement<FieldControlProps>;
  controlId: string;
  hintId: string | undefined;
  errorId: string | undefined;
  busy: boolean;
  disabled: boolean;
  error: string | undefined;
}

function buildFieldControl(opts: FieldControlOptions) {
  const describedBy =
    [opts.children.props["aria-describedby"], opts.hintId, opts.errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  return React.cloneElement(opts.children, {
    id: opts.controlId,
    className: cn(fieldControlClassName, opts.children.props.className),
    disabled: opts.children.props.disabled || opts.disabled || opts.busy,
    "aria-busy": opts.busy || opts.children.props["aria-busy"],
    "aria-describedby": describedBy,
    "aria-invalid": opts.error ? true : opts.children.props["aria-invalid"],
  });
}

function useFieldControl(
  opts: Pick<FieldProps, "children" | "id" | "hint" | "error" | "busy" | "disabled">,
) {
  const generatedId = useId();
  const controlId = opts.children.props.id ?? opts.id ?? generatedId;
  const hintId = opts.hint ? `${controlId}-hint` : undefined;
  const errorId = opts.error ? `${controlId}-error` : undefined;
  const control = buildFieldControl({
    children: opts.children,
    controlId,
    hintId,
    errorId,
    busy: opts.busy ?? false,
    disabled: opts.disabled ?? false,
    error: opts.error,
  });
  return { controlId, hintId, errorId, control };
}

export default function Field({
  id,
  label,
  hint,
  error,
  busy = false,
  disabled = false,
  className,
  children,
}: FieldProps) {
  const ctrl = useFieldControl({ children, id, hint, error, busy, disabled });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel controlId={ctrl.controlId} label={label} hint={hint} hintId={ctrl.hintId} />
      {ctrl.control}
      <FieldError errorId={ctrl.errorId} error={error} />
    </div>
  );
}

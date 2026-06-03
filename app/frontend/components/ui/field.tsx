import React, { useId } from "react";

import { cn } from "./class_names";

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

// eslint-disable-next-line react/no-multi-comp
function FieldHint({ hintId, hint }: { hintId?: string; hint?: string }) {
  if (!hint) {
    return null;
  }
  return (
    <span id={hintId} className="text-[10px] text-mc-text-dim">
      {hint}
    </span>
  );
}

// eslint-disable-next-line react/no-multi-comp
function FieldLabel({ controlId, label, hint, hintId }: {
  controlId: string; label: string; hint?: string; hintId?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <label htmlFor={controlId} className="text-xs font-normal uppercase tracking-widest text-mc-text-dim">
        {label}
      </label>
      <FieldHint hintId={hintId} hint={hint} />
    </div>
  );
}

// eslint-disable-next-line react/no-multi-comp
function FieldError({ errorId, error }: { errorId?: string; error?: string }) {
  if (!error) {
    return null;
  }
  return (
    <p id={errorId} role="alert" className="text-xs font-medium text-mc-feedback-danger">
      {error}
    </p>
  );
}

// eslint-disable-next-line eslint/max-lines-per-function, react/no-multi-comp
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
  const generatedId = useId();
  const controlId = children.props.id ?? id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const control = buildFieldControl({
    children,
    controlId,
    hintId,
    errorId,
    busy,
    disabled,
    error,
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel controlId={controlId} label={label} hint={hint} hintId={hintId} />
      {control}
      <FieldError errorId={errorId} error={error} />
    </div>
  );
}

import React from "react";

interface JobConfig {
  barColor: string;
  label: string;
  animate: boolean;
}

const STATUS_CONFIG: Record<string, JobConfig> = {
  idle: { barColor: "bg-mc-feedback-neutral-border", label: "Idle", animate: false },
  completed: { barColor: "bg-mc-feedback-success", label: "Complete", animate: false },
  syncing: { barColor: "bg-mc-feedback-progress", label: "Syncing", animate: true },
  processing: { barColor: "bg-mc-feedback-progress", label: "Processing", animate: true },
  enriching: { barColor: "bg-mc-feedback-progress", label: "Enriching", animate: true },
  pending: { barColor: "bg-mc-feedback-warning", label: "Pending", animate: false },
  failed: { barColor: "bg-mc-feedback-danger", label: "Failed", animate: false },
};

const BAR_TRACK = "h-2 w-full overflow-hidden rounded-full bg-mc-bg-raised";

function resolveConfig(status: string): JobConfig {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.idle;
}

function barPct(config: JobConfig, label: string, pct: number) {
  return (
    <div className={BAR_TRACK}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${config.barColor}`}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-label={`${label}: ${pct}%`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function barAnimated(label: string) {
  return (
    <div className={BAR_TRACK}>
      <div
        className="h-full w-full animate-pulse rounded-full bg-mc-feedback-progress/60"
        role="progressbar"
        aria-label={`${label} in progress`}
        aria-valuetext="processing"
      />
    </div>
  );
}

function barStatic(config: JobConfig, label: string) {
  return (
    <div className={BAR_TRACK}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${config.barColor}`}
        style={{ width: "100%" }}
        role="progressbar"
        aria-label={`${label} status: ${config.label}`}
        aria-valuetext={config.label}
      />
    </div>
  );
}

function barHtml(config: JobConfig, label: string, pct?: number | null): React.ReactNode {
  if (pct != null && pct > 0) {
    return barPct(config, label, pct);
  }
  if (config.animate) {
    return barAnimated(label);
  }
  return barStatic(config, label);
}

function labelHtml(config: JobConfig, pct?: number | null): React.ReactNode {
  const text = pct != null && pct > 0 && config.animate ? `${pct}%` : config.label;
  return <span className="mt-0.5 block text-[11px] text-mc-text-dim">{text}</span>;
}

export default function JobProgressBar({
  status,
  label,
  progressPct,
}: {
  status: string;
  label: string;
  progressPct?: number | null;
}) {
  const config = resolveConfig(status);
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
      <dd className="mt-1">
        {barHtml(config, label, progressPct)}
        {labelHtml(config, progressPct)}
      </dd>
    </div>
  );
}

import React from "react"

interface JobConfig { barColor: string; label: string; animate: boolean }

const STATUS_CONFIG: Record<string, JobConfig> = {
  idle: { barColor: "bg-mc-feedback-neutral-border", label: "Idle", animate: false },
  completed: { barColor: "bg-mc-feedback-success", label: "Complete", animate: false },
  syncing: { barColor: "bg-mc-feedback-progress", label: "Syncing", animate: true },
  processing: { barColor: "bg-mc-feedback-progress", label: "Processing", animate: true },
  enriching: { barColor: "bg-mc-feedback-progress", label: "Enriching", animate: true },
  pending: { barColor: "bg-mc-feedback-warning", label: "Pending", animate: false },
  failed: { barColor: "bg-mc-feedback-danger", label: "Failed", animate: false },
}

function resolveConfig(status: string): JobConfig {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.idle
}

function barHtml(config: JobConfig, label: string, pct?: number | null): React.ReactNode {
  if (pct != null && pct > 0) {return (<div className="h-2 w-full overflow-hidden rounded-full bg-mc-bg-raised"><div className={`h-full rounded-full transition-all duration-700 ${config.barColor}`} style={{ width: `${pct}%` }} role="progressbar" aria-label={`${label}: ${pct}%`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} /></div>)}
  if (config.animate) {return (<div className="h-2 w-full overflow-hidden rounded-full bg-mc-bg-raised"><div className="h-full w-full animate-pulse rounded-full bg-mc-feedback-progress/60" role="progressbar" aria-label={`${label} in progress`} aria-valuetext="processing" /></div>)}
  return (<div className="h-2 w-full overflow-hidden rounded-full bg-mc-bg-raised"><div className={`h-full rounded-full transition-all duration-700 ${config.barColor}`} style={{ width: "100%" }} role="progressbar" aria-label={`${label} status: ${config.label}`} aria-valuetext={config.label} /></div>)
}

function labelHtml(config: JobConfig, pct?: number | null): React.ReactNode {
  return <span className="mt-0.5 block text-[11px] text-mc-text-dim">{(pct != null && pct > 0 && config.animate) ? `${pct}%` : config.label}</span>
}

export default function JobProgressBar({ status, label, progressPct }: { status: string; label: string; progressPct?: number | null }) {
  const config = resolveConfig(status)
  return (<div className="min-w-0"><dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt><dd className="mt-1">{barHtml(config, label, progressPct)}{labelHtml(config, progressPct)}</dd></div>)
}

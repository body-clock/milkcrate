import React from "react"

interface JobProgressBarConfig {
  barColor: string
  label: string
  animate: boolean
}

const STATUS_CONFIG: Record<string, JobProgressBarConfig> = {
  idle: { barColor: "bg-mc-text-dim/20", label: "Idle", animate: false },
  completed: { barColor: "bg-emerald-400", label: "Complete", animate: false },
  syncing: { barColor: "bg-sky-400", label: "Syncing", animate: true },
  processing: { barColor: "bg-sky-400", label: "Processing", animate: true },
  enriching: { barColor: "bg-sky-400", label: "Enriching", animate: true },
  pending: { barColor: "bg-amber-400", label: "Pending", animate: false },
  failed: { barColor: "bg-red-400", label: "Failed", animate: false },
}

function resolveConfig(status: string): JobProgressBarConfig {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.idle
}

export default function JobProgressBar({
  status,
  label,
  progressPct,
}: {
  status: string
  label: string
  progressPct?: number | null
}) {
  const config = resolveConfig(status)

  // Show real progress bar when we have percentage data
  if (progressPct != null && progressPct > 0) {
    return (
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
        <dd className="mt-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-mc-bg-raised">
            <div
              className={`h-full rounded-full transition-all duration-700 ${config.animate ? "bg-sky-400" : config.barColor}`}
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-label={`${label}: ${progressPct}%`}
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <span className="mt-0.5 block text-[11px] text-mc-text-dim">
            {config.animate ? `${progressPct}%` : config.label}
          </span>
        </dd>
      </div>
    )
  }

  // Fallback: status-based visual (no progress data available)
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-mc-text-dim">{label}</dt>
      <dd className="mt-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-mc-bg-raised">
          {config.animate ? (
            <div
              className="h-full w-full animate-pulse rounded-full bg-sky-400/60"
              role="progressbar"
              aria-label={`${label} in progress`}
              aria-valuetext="processing"
            />
          ) : (
            <div
              className={`h-full rounded-full transition-all duration-700 ${config.barColor}`}
              style={{ width: "100%" }}
              role="progressbar"
              aria-label={`${label} status: ${config.label}`}
              aria-valuetext={config.label}
            />
          )}
        </div>
        <span className="mt-0.5 block text-[11px] text-mc-text-dim">{config.label}</span>
      </dd>
    </div>
  )
}

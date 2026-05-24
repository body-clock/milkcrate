import React from "react"

type JobStatus = string

interface JobProgressBarConfig {
  fillPercent: number
  barColor: string
  label: string
  animate: boolean
}

const STATUS_CONFIG: Record<string, JobProgressBarConfig> = {
  idle: { fillPercent: 100, barColor: "bg-mc-text-dim/20", label: "Idle", animate: false },
  completed: { fillPercent: 100, barColor: "bg-emerald-400", label: "Complete", animate: false },
  syncing: { fillPercent: 100, barColor: "bg-sky-400", label: "Syncing", animate: true },
  processing: { fillPercent: 100, barColor: "bg-sky-400", label: "Processing", animate: true },
  pending: { fillPercent: 15, barColor: "bg-amber-400", label: "Pending", animate: false },
  failed: { fillPercent: 0, barColor: "bg-red-400", label: "Failed", animate: false },
}

function resolveConfig(status: string): JobProgressBarConfig {
  return STATUS_CONFIG[status.toLowerCase()] ?? STATUS_CONFIG.idle
}

export default function JobProgressBar({
  status,
  label,
}: {
  status: string
  label: string
}) {
  const config = resolveConfig(status)

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
              style={{ width: `${config.fillPercent}%` }}
              role="progressbar"
              aria-label={`${label} status: ${config.label}`}
              aria-valuenow={config.fillPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          )}
        </div>
        <span className="mt-0.5 block text-[11px] text-mc-text-dim">{config.label}</span>
      </dd>
    </div>
  )
}

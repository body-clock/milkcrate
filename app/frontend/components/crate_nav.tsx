import React from "react"

interface Props {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export default function CrateNav({ index, total, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between mt-4">
      <span></span>
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={index <= 0}
          className="text-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <span className="text-sm text-gray-400 tabular-nums">
          {total > 0 ? index + 1 : 0} / {total}
        </span>
        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className="text-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
      <span className="text-xs text-gray-600">← → to browse</span>
    </div>
  )
}

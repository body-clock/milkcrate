import React from "react"
import FeedbackMessage from "@/components/ui/feedback_message"

export default function MarketingFlashBanner({ notice, alert }: { notice?: string; alert?: string }) {
  const msg = notice || alert
  if (!msg) {return null}
  return (
    <FeedbackMessage tone={notice ? "success" : "danger"} live={notice ? "polite" : "assertive"} className="rounded-none border-x-0 px-4 py-2">
      {msg}
    </FeedbackMessage>
  )
}

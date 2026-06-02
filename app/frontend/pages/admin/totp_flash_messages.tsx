import FeedbackMessage from "@/components/ui/feedback_message"

interface TotpFlashMessagesProps {
  notice?: string
  alert?: string
}

export function TotpFlashMessages({ notice, alert }: TotpFlashMessagesProps) {
  return (
    <>
      {notice && (
        <div className="mb-4">
          <FeedbackMessage tone="success" live="polite">{notice}</FeedbackMessage>
        </div>
      )}
      {alert && (
        <div className="mb-4">
          <FeedbackMessage tone="danger" live="assertive">{alert}</FeedbackMessage>
        </div>
      )}
    </>
  )
}

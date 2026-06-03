import FeedbackMessage from "@/components/ui/feedback_message";

interface FlashBannerProps {
  notice?: string;
  flashAlert?: string;
}

export default function FlashBanner({ notice, flashAlert }: FlashBannerProps) {
  const msg = notice || flashAlert;
  if (!msg) {
    return null;
  }
  return (
    <FeedbackMessage
      tone={notice ? "success" : "danger"}
      live={notice ? "polite" : "assertive"}
      className="rounded-none border-x-0 px-4 py-2"
    >
      {msg}
    </FeedbackMessage>
  );
}

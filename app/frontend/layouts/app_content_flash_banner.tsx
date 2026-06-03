import FeedbackMessage from "@/components/ui/feedback_message";

interface AppContentFlashBannerProps {
  flashMsg?: string;
  hasNotice: boolean;
}

export default function AppContentFlashBanner({
  flashMsg,
  hasNotice,
}: AppContentFlashBannerProps) {
  if (!flashMsg) {
    return undefined;
  }
  return (
    <FeedbackMessage
      tone={hasNotice ? "success" : "danger"}
      live={hasNotice ? "polite" : "assertive"}
      className="rounded-none border-x-0 px-4 py-2"
    >
      {flashMsg}
    </FeedbackMessage>
  );
}

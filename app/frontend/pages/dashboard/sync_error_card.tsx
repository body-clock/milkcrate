import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card_header";
import CardTitle from "@/components/ui/card_title";
import CardContent from "@/components/ui/card_content";
import FeedbackMessage from "@/components/ui/feedback_message";

interface SyncErrorCardProps {
  summary: string;
  errorAt: string | null;
}

export default function SyncErrorCard({ summary, errorAt }: SyncErrorCardProps) {
  return (
    <Card className="border-mc-feedback-danger-border">
      <CardHeader>
        <CardTitle className="text-mc-feedback-danger">Last sync error</CardTitle>
      </CardHeader>
      <CardContent>
        <FeedbackMessage tone="danger" live="assertive" className="border-0 bg-transparent p-0">
          <p className="text-sm leading-relaxed">{summary}</p>
          <p className="text-xs mt-2">{errorAt ? new Date(errorAt).toLocaleString() : null}</p>
        </FeedbackMessage>
      </CardContent>
    </Card>
  );
}

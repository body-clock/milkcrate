import type { AdminApplicantSummary } from "@/types/inertia";
import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card_header";
import CardTitle from "@/components/ui/card_title";
import CardContent from "@/components/ui/card_content";
import ApplicantInfo from "./applicant_info";
import { OnboardingForm } from "./onboarding_form";

function formatTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ApplicantCard({ applicant }: { applicant: AdminApplicantSummary }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>{applicant.name}</CardTitle>
          <ApplicantInfo applicant={applicant} />
        </div>
        <OnboardingForm applicant={applicant} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-mc-text-dim">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>Inventory: {applicant.inventory_size || "Not specified"}</span>
          <span>Submitted: {formatTime(applicant.submitted_at)}</span>
        </div>
        {applicant.notes && <p className="whitespace-pre-wrap break-words">{applicant.notes}</p>}
      </CardContent>
    </Card>
  );
}

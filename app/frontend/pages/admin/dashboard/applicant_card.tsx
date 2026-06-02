import type { AdminApplicantSummary } from "@/types/inertia";
import Button from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTime(value: string | null) {
  if (!value) {return "Not yet";}
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ApplicantCard({
  applicant,
}: {
  applicant: AdminApplicantSummary;
}) {
  const csrfToken =
    typeof document !== "undefined"
      ? document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content
      : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>{applicant.name}</CardTitle>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-mc-text-dim">
            <span>{applicant.email}</span>
            <span>@{applicant.discogs_username}</span>
          </div>
        </div>
        <form action={`/admin/waitlists/${applicant.id}/onboarding`} method="post">
          {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
          <Button type="submit">Onboard store</Button>
        </form>
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

import type { AdminApplicantSummary } from "@/types/inertia";

export default function ApplicantInfo({ applicant }: { applicant: AdminApplicantSummary }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-mc-text-dim">
      <span>{applicant.email}</span>
      <span>@{applicant.discogs_username}</span>
    </div>
  );
}

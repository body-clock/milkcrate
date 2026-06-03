import EmptyState from "@/components/ui/empty_state";
import SectionHeader from "@/components/ui/section_header";
import type { AdminDashboardProps } from "@/types/inertia";

import { ApplicantGrid } from "./applicant_grid";

export function ApplicantsSection({
  applicants,
}: {
  applicants: AdminDashboardProps["applicants"];
}) {
  return (
    <section aria-labelledby="applicants-heading">
      <SectionHeader
        id="applicants-heading"
        title="Applicants"
        description="Stores waiting to be onboarded into Milkcrate."
      />
      {applicants.length === 0 ? (
        <EmptyState>No applicants waiting.</EmptyState>
      ) : (
        <ApplicantGrid applicants={applicants} />
      )}
    </section>
  );
}

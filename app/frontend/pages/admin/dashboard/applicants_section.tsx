import type { AdminDashboardProps } from "@/types/inertia";
import EmptyState from "@/components/ui/empty_state";
import SectionHeader from "@/components/ui/section_header";
import ApplicantCard from "./applicant_card";

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
        <div className="grid gap-4 lg:grid-cols-2">
          {applicants.map((applicant) => (
            <ApplicantCard key={applicant.id} applicant={applicant} />
          ))}
        </div>
      )}
    </section>
  );
}

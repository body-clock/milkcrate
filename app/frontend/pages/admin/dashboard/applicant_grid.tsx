import type { AdminDashboardProps } from "@/types/inertia";

import ApplicantCard from "./applicant_card";

export function ApplicantGrid({
  applicants,
}: {
  applicants: AdminDashboardProps["applicants"];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {applicants.map((applicant) => (
        <ApplicantCard key={applicant.id} applicant={applicant} />
      ))}
    </div>
  );
}

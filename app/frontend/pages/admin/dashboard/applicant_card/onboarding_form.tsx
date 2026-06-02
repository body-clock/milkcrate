import type { AdminApplicantSummary } from "@/types/inertia";
import Button from "@/components/ui/button";

export function OnboardingForm({ applicant }: { applicant: AdminApplicantSummary }) {
  const csrfToken =
    typeof document === "undefined"
      ? undefined
      : document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;

  return (
    <form action={`/admin/waitlists/${applicant.id}/onboarding`} method="post">
      {csrfToken && <input type="hidden" name="authenticity_token" value={csrfToken} />}
      <Button type="submit">Onboard store</Button>
    </form>
  );
}

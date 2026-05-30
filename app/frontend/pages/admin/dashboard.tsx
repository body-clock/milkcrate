import { useEffect } from "react";
import { router } from "@inertiajs/react";
import type { AdminDashboardProps } from "@/types/inertia";
import EmptyState from "@/components/ui/empty_state";
import FeedbackMessage from "@/components/ui/feedback_message";
import SectionHeader from "@/components/ui/section_header";
import Metric from "@/components/ui/metric";
import MilkcrateShell from "@/layouts/milkcrate_shell";
import { DiscogsOnboardingPanel } from "./dashboard/discogs_onboarding_panel";
import StoreCard from "./dashboard/store_card";
import ApplicantCard from "./dashboard/applicant_card";

export default function Dashboard({
  active_stores,
  applicants,
  discogs_onboarding,
  notice,
  alert,
}: AdminDashboardProps) {
  const healthyCount = active_stores.filter((store) => store.health.key === "healthy").length;
  const attentionCount = active_stores.filter((store) =>
    ["failed", "stale", "partial"].includes(store.health.key),
  ).length;
  const processingCount = active_stores.filter((store) => store.health.key === "processing").length;

  const hasActiveJobs = active_stores.some(
    (s) => s.sync_status === "syncing" || s.enrichment_status === "enriching",
  );
  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(() => {
      router.reload({ only: ["active_stores"] });
    }, 3000);
    return () => clearInterval(interval);
  }, [hasActiveJobs]);

  const header = (
    <header className="border-b border-mc-border px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-mc-text-dim">Milkcrate admin</p>
            <h1 className="mt-2 text-2xl font-bold text-mc-text sm:text-3xl">Store operations</h1>
          </div>
          <button
            onClick={() => router.delete("/admin/logout")}
            className="shrink-0 text-xs text-mc-text-dim underline hover:text-mc-text transition-colors"
          >
            Sign out
          </button>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:min-w-80">
          <Metric
            label="Healthy"
            value={healthyCount}
            className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2"
          />
          <Metric
            label="Processing"
            value={processingCount}
            className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2"
          />
          <Metric
            label="Attention"
            value={attentionCount}
            className="rounded-lg border border-mc-border bg-mc-bg-card px-3 py-2"
          />
        </dl>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-mc-bg text-mc-text">
      <MilkcrateShell
        header={header}
        afterHeader={
          notice || alert ? (
            <div className="mx-auto grid w-full max-w-7xl gap-2 px-4 pt-6 sm:px-6 lg:px-8">
              {notice && (
                <FeedbackMessage tone="success" live="polite">
                  {notice}
                </FeedbackMessage>
              )}
              {alert && (
                <FeedbackMessage tone="danger" live="assertive">
                  {alert}
                </FeedbackMessage>
              )}
            </div>
          ) : undefined
        }
        contentWidth="max-w-7xl"
        contentPadding="px-4 py-6 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-8">
          <DiscogsOnboardingPanel
            lookupPath={discogs_onboarding.lookup_path}
            createPath={discogs_onboarding.create_path}
          />

          <section aria-labelledby="active-stores-heading">
            <SectionHeader
              id="active-stores-heading"
              title="Active stores"
              description="Quick health, sync, enrichment, and inventory coverage for stores in Milkcrate."
            />
            {active_stores.length === 0 ? (
              <EmptyState>No stores online yet.</EmptyState>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {active_stores.map((store) => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            )}
          </section>

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
        </div>
      </MilkcrateShell>
    </div>
  );
}

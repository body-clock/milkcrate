import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card_header";
import CardTitle from "@/components/ui/card_title";
import { useDiscogsOnboarding } from "./discogs_onboarding/use_discogs_onboarding";
import { PanelView } from "./discogs_onboarding/panel_view";

export function DiscogsOnboardingPanel({ lookupPath, createPath }: { lookupPath: string; createPath: string }) {
  const { username, isBusy, csrfToken, state, handleUsernameChange, handleLookup } = useDiscogsOnboarding(lookupPath);
  return (
    <section aria-labelledby="discogs-onboarding-heading">
      <Card>
        <CardHeader>
          <CardTitle id="discogs-onboarding-heading">Add Discogs storefront</CardTitle>
        </CardHeader>
        <PanelView isBusy={isBusy} state={state} username={username} createPath={createPath} csrfToken={csrfToken} onUsernameChange={handleUsernameChange} onLookup={handleLookup} />
      </Card>
    </section>
  );
}

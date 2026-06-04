import Card from "@/components/ui/card";
import CardHeader from "@/components/ui/card_header";
import CardTitle from "@/components/ui/card_title";

import { PanelView } from "./discogs_onboarding/panel_view";
import { useDiscogsOnboarding } from "./discogs_onboarding/use_discogs_onboarding";

type Props = { lookupPath: string; createPath: string };

export function DiscogsOnboardingPanel({ lookupPath, createPath }: Props) {
  const { username, isBusy, csrfToken, state, handleUsernameChange, handleLookup } =
    useDiscogsOnboarding(lookupPath);
  return (
    <section aria-labelledby="discogs-onboarding-heading">
      <Card>
        <CardHeader>
          <CardTitle id="discogs-onboarding-heading">Add Discogs storefront</CardTitle>
        </CardHeader>
        <PanelView
          isBusy={isBusy}
          state={state}
          username={username}
          createPath={createPath}
          csrfToken={csrfToken}
          onUsernameChange={handleUsernameChange}
          onLookup={handleLookup}
        />
      </Card>
    </section>
  );
}

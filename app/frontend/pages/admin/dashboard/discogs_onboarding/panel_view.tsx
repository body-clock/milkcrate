import CardContent from "@/components/ui/card_content";
import type { useAdminDiscogsLookup } from "@/hooks/use_admin_discogs_lookup";

import { LookupForm } from "./lookup_form";
import { StatusMessages } from "./status_messages";

type PanelViewProps = {
  isBusy: boolean;
  state: ReturnType<typeof useAdminDiscogsLookup>["state"];
  username: string;
  createPath: string;
  csrfToken: string | undefined;
  onUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLookup: (e: React.FormEvent<HTMLFormElement>) => void;
};

// eslint-disable-next-line max-lines-per-function
export function PanelView({
  isBusy,
  state,
  username,
  createPath,
  csrfToken,
  onUsernameChange,
  onLookup,
}: PanelViewProps) {
  return (
    <CardContent className="space-y-4">
      <LookupForm
        username={username}
        isBusy={isBusy}
        onUsernameChange={onUsernameChange}
        onLookup={onLookup}
      />
      <StatusMessages state={state} isBusy={isBusy} createPath={createPath} csrfToken={csrfToken} />
    </CardContent>
  );
}

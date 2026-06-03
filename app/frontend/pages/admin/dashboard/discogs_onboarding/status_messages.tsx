import type {
  AdminLookupState,
  AdminDiscogsLookupResponse,
} from "@/hooks/use_admin_discogs_lookup";

import { LookupMessage } from "./lookup_message";
import { LookupResult } from "./lookup_result";

function errorMessage() {
  return (
    <LookupMessage tone="danger">
      Lookup failed. Try again before creating a storefront.
    </LookupMessage>
  );
}

function busyMessage() {
  return (
    <LookupMessage tone="progress">Checking Discogs and current admin records...</LookupMessage>
  );
}

// eslint-disable-next-line max-lines-per-function
export function StatusMessages({
  state,
  isBusy,
  createPath,
  csrfToken,
}: {
  state: AdminLookupState;
  isBusy: boolean;
  createPath: string;
  csrfToken: string | undefined;
}) {
  const resultState =
    state.status === "result"
      ? (state as AdminLookupState & { status: "result"; result: AdminDiscogsLookupResponse })
      : null;
  return (
    <>
      {state.status === "error" && errorMessage()}
      {isBusy && busyMessage()}
      {resultState && (
        <LookupResult lookup={resultState.result} createPath={createPath} csrfToken={csrfToken} />
      )}
    </>
  );
}

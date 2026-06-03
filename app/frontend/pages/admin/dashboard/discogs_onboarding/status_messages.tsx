import type { AdminLookupState, AdminDiscogsLookupResponse } from "@/hooks/use_admin_discogs_lookup";

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

function extractResult(
  state: AdminLookupState,
): (AdminLookupState & { status: "result"; result: AdminDiscogsLookupResponse }) | null {
  if (state.status !== "result") {
    return null;
  }
  return state as AdminLookupState & { status: "result"; result: AdminDiscogsLookupResponse };
}

type StatusMessagesProps = {
  state: AdminLookupState;
  isBusy: boolean;
  createPath: string;
  csrfToken: string | undefined;
};

export function StatusMessages({ state, isBusy, createPath, csrfToken }: StatusMessagesProps) {
  const resultState = extractResult(state);
  return (
    <>
      {state.status === "error" && errorMessage()}
      {isBusy && busyMessage()}
      {resultState !== null && (
        <LookupResult
          lookup={resultState.result}
          createPath={createPath}
          csrfToken={csrfToken}
        />
      )}
    </>
  );
}
